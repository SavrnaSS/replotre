import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getUserFromCookie } from "@/app/lib/auth";
import { getInfluencerById } from "@/app/data/influencers";

export const runtime = "nodejs";

function getBackendBase() {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_BACKEND_URL ||
    "";
  return String(raw).replace(/\/+$/, "");
}

function getNanoBananaEndpoint() {
  const explicit = (process.env.NANO_BANANA_API_URL || "").trim();
  if (explicit) {
    try {
      const parsed = new URL(explicit);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return explicit;
      }
    } catch {
      // Ignore invalid URL and fallback to backend base.
    }
  }

  const base = getBackendBase();
  if (!base) return "";
  return `${base}/generate`;
}

function cleanPrompt(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function getHiddenQualityPrompt() {
  const envPrompt = cleanPrompt(String(process.env.HIDDEN_GENERATION_PROMPT || ""));

  const defaultPrompt = cleanPrompt(
    [
      "Photoreal editorial studio image.",
      "Premium composition and cinematic lighting with natural shadow falloff.",
      "Realistic skin texture with visible pores, accurate anatomy, and high-fidelity facial detail.",
      "Sharp subject focus, clean background separation, and balanced color grading.",
      "MUST use only the provided reference face as the single primary subject.",
      "Preserve facial geometry, eye shape, nose, lips, jawline, and skin tone from the reference.",
      "Do not alter identity, age, ethnicity, or core facial structure.",
      "No face swap to any other person and no secondary prominent faces.",
      "Brand-safe visual output, no artifacts, no extra faces, no text, no watermark, no logo.",
    ].join(" ")
  );

  if (!envPrompt) return defaultPrompt;
  return cleanPrompt(`${defaultPrompt} ${envPrompt}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function extToMime(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function isImageString(value: string) {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("data:image/") ||
    v.startsWith("/uploads/") ||
    v.startsWith("/model/")
  );
}

function extractImageFromUnknown(input: unknown, depth = 0): string | null {
  if (depth > 5 || input == null) return null;

  if (typeof input === "string") {
    return isImageString(input) ? input : null;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = extractImageFromUnknown(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const preferredKeys = [
      "image",
      "imageUrl",
      "result",
      "url",
      "img",
      "output",
      "images",
      "data",
    ];
    for (const key of preferredKeys) {
      if (typeof obj[key] !== "undefined") {
        const found = extractImageFromUnknown(obj[key], depth + 1);
        if (found) return found;
      }
    }
    for (const value of Object.values(obj)) {
      const found = extractImageFromUnknown(value, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

async function parseUpstreamResponse(res: Response) {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text().catch(() => "");

  const looksJson = contentType.includes("application/json") || text.trim().startsWith("{");
  if (looksJson) {
    try {
      return { json: JSON.parse(text), raw: text };
    } catch {
      return { json: null, raw: text };
    }
  }

  return { json: null, raw: text };
}

async function generateCandidate(opts: {
  nanoEndpoint: string;
  headers: Headers;
  finalPrompt: string;
  style: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  userId: string;
  influencerId: string;
  fileName: string;
  mime: string;
  faceBytes: Uint8Array;
}) {
  const form = new FormData();
  form.append("prompt", opts.finalPrompt);
  form.append("style", opts.style);
  form.append("width", String(opts.width));
  form.append("height", String(opts.height));
  form.append("steps", String(opts.steps));
  form.append("guidance", String(opts.guidance));
  form.append("userId", opts.userId);
  form.append("influencerId", opts.influencerId);
  form.append("faceLockMode", "server_mapped");
  form.append("primaryFaceRequired", "true");
  form.append("hiddenPromptApplied", "true");

  const safeBytes = new Uint8Array(opts.faceBytes);
  const faceBlob = new Blob([safeBytes.buffer], { type: opts.mime });
  const faceFile = new File([faceBlob], opts.fileName, { type: opts.mime });

  form.append("face", faceFile);
  form.append("source_img", faceFile);

  const upstream = await fetch(opts.nanoEndpoint, {
    method: "POST",
    headers: opts.headers,
    body: form,
  });

  const { json, raw } = await parseUpstreamResponse(upstream);
  if (!upstream.ok) {
    return {
      ok: false as const,
      upstreamStatus: upstream.status,
      message: json?.error || json?.message || "Nano Banana generation failed",
      details: json || raw.slice(0, 1500),
    };
  }

  if (json && typeof json === "object") {
    const image = extractImageFromUnknown(json);
    return {
      ok: true as const,
      json,
      raw,
      image,
    };
  }

  return {
    ok: true as const,
    json: null,
    raw,
    image: extractImageFromUnknown(raw) || raw,
  };
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromCookie(req);
    if (!user?.id) {
      return NextResponse.json({ error: "not-auth" }, { status: 401 });
    }

    const body = asRecord(await req.json().catch(() => ({})));

    // Security: client is not allowed to override face reference.
    if (
      typeof body.face !== "undefined" ||
      typeof body.faceUrl !== "undefined" ||
      typeof body.source_img !== "undefined" ||
      typeof body.sourceImage !== "undefined"
    ) {
      return NextResponse.json(
        { error: "face_override_blocked", message: "Face reference is server-locked per user." },
        { status: 400 }
      );
    }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const style = String(body.style || "photorealistic");
    const width = Number(body.width || 1024);
    const height = Number(body.height || 1024);
    const steps = Number(body.steps || 30);
    const guidance = Number(body.guidance || 7);

    const profile = await prisma.onboardingProfile.findUnique({
      where: { userId: user.id },
      select: { data: true },
    });

    const profileData = asRecord(profile?.data);
    const influencerId = String(profileData.influencerId || "").trim();
    if (!influencerId) {
      return NextResponse.json(
        {
          error: "influencer_not_mapped",
          message: "No influencer face is mapped to this user.",
        },
        { status: 409 }
      );
    }

    const influencer = getInfluencerById(influencerId);
    if (!influencer?.src) {
      return NextResponse.json(
        {
          error: "invalid_influencer_mapping",
          message: "Mapped influencer is invalid or missing face source.",
        },
        { status: 409 }
      );
    }

    const relativeFacePath = influencer.src.replace(/^\/+/, "");
    const absoluteFacePath = path.join(process.cwd(), "public", relativeFacePath);
    const faceBytes = new Uint8Array(await fs.readFile(absoluteFacePath));
    const fileName = path.basename(absoluteFacePath);
    const mime = extToMime(absoluteFacePath);

    const hiddenPrompt = getHiddenQualityPrompt();
    const identityLockPrompt = cleanPrompt(
      `Reference identity lock: ${influencer.name}. Match this exact person from source_img.`
    );
    const finalPrompt = cleanPrompt(`${prompt}\n${identityLockPrompt}\n${hiddenPrompt}`);

    const nanoEndpoint = getNanoBananaEndpoint();
    if (!nanoEndpoint) {
      return NextResponse.json(
        {
          error: "missing_nano_banana_endpoint",
          message: "Set NANO_BANANA_API_URL or NEXT_PUBLIC_BACKEND_URL.",
        },
        { status: 500 }
      );
    }

    const nanoKey = (process.env.NANO_BANANA_API_KEY || "").trim();
    const headers = new Headers();
    if (nanoKey) {
      headers.set("Authorization", `Bearer ${nanoKey}`);
    }

    const candidate = await generateCandidate({
      nanoEndpoint,
      headers,
      finalPrompt,
      style,
      width,
      height,
      steps,
      guidance,
      userId: user.id,
      influencerId,
      fileName,
      mime,
      faceBytes,
    });

    if (!candidate.ok) {
      return NextResponse.json(
        {
          error: "generation_failed",
          message: candidate.message || "Nano Banana generation failed",
          upstreamStatus: candidate.upstreamStatus,
          details: candidate.details,
        },
        { status: candidate.upstreamStatus >= 400 ? candidate.upstreamStatus : 502 }
      );
    }

    const image = String(candidate.image || "").trim();
    if (!image) {
      return NextResponse.json(
        {
          error: "generation_failed",
          message: "No image returned by model.",
          details: candidate.raw || null,
        },
        { status: 502 }
      );
    }

    const payload =
      candidate.json && typeof candidate.json === "object"
        ? (candidate.json as Record<string, unknown>)
        : {};

    return NextResponse.json({
      ...payload,
      image,
      faceLock: {
        enforced: true,
        mode: "server_mapped",
        influencerId,
        faceSource: influencer.src,
      },
      faceConsistency: {
        checked: false,
        passed: true,
        score: null,
        threshold: null,
        attemptsUsed: 1,
        maxAttempts: 1,
      },
    });

    return NextResponse.json(
      {
        error: "generation_failed",
        message: "No valid image candidate generated.",
        details: null,
      },
      { status: 502 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    const dbUnavailable =
      message.includes("PrismaClientInitializationError") ||
      message.includes("Can't reach database server");

    if (dbUnavailable) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    if (message.includes("ENOENT")) {
      return NextResponse.json(
        { error: "face_asset_missing", message: "Mapped influencer face asset is missing." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: message || "AI generation failed" },
      { status: 500 }
    );
  }
}
