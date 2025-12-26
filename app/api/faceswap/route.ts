// app/api/faceswap/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ✅ Railway often needs more time for first InsightFace cold start
const UPSTREAM_TIMEOUT_MS = Number(process.env.FACESWAP_TIMEOUT_MS || 180000); // 3 min default

function getBackendBase() {
  // keep your existing env name (but allow non-public fallback too)
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_BACKEND_URL ||
    "";
  return String(raw).replace(/\/+$/, "");
}

// ✅ read response safely without losing the raw body (helps debugging)
async function readUpstreamBody(res: Response) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text().catch(() => "");
  const isJson =
    ct.includes("application/json") ||
    ct.includes("application/problem+json") ||
    ct.includes("text/json");

  if (isJson) {
    try {
      return { kind: "json" as const, data: JSON.parse(text || "{}"), raw: text };
    } catch {
      return { kind: "text" as const, data: null, raw: text };
    }
  }

  // sometimes backend returns JSON but forgets header
  try {
    const parsed = JSON.parse(text);
    return { kind: "json" as const, data: parsed, raw: text };
  } catch {
    return { kind: "text" as const, data: null, raw: text };
  }
}

export async function POST(req: Request) {
  const BACKEND = getBackendBase();

  if (!BACKEND) {
    return NextResponse.json(
      {
        error: "MISSING_BACKEND_URL",
        message:
          "Missing NEXT_PUBLIC_BACKEND_URL (or BACKEND_URL). Set it to your FastAPI base URL, e.g. https://xxxxx.up.railway.app",
      },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Request must be multipart/form-data" },
      { status: 400 }
    );
  }

  // ✅ Keep compatibility with your backend signature
  const source = form.get("source_img");
  const theme = form.get("theme_name");
  const targetImg = form.get("target_img");
  const targetImgUrl = form.get("target_img_url");

  if (!source) {
    return NextResponse.json(
      { error: "MISSING_SOURCE", message: "Missing source_img" },
      { status: 400 }
    );
  }

  // theme is required in your current UI flow
  if (!theme || typeof theme !== "string") {
    return NextResponse.json(
      { error: "MISSING_THEME", message: "Missing theme_name" },
      { status: 400 }
    );
  }

  // ✅ forward ALL optional fields (safe, doesn’t break existing)
  const forward = new FormData();
  forward.append("source_img", source as any);
  forward.append("theme_name", theme);

  if (targetImg) forward.append("target_img", targetImg as any);
  if (targetImgUrl && typeof targetImgUrl === "string") {
    forward.append("target_img_url", targetImgUrl);
  }

  // ✅ Timeout + pass-through errors (no more {} mystery)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/faceswap`, {
      method: "POST",
      body: forward,
      signal: controller.signal,
      // NOTE: do NOT set Content-Type; fetch will set the multipart boundary correctly
    });
  } catch (err: any) {
    clearTimeout(timeout);

    const isAbort =
      err?.name === "AbortError" ||
      String(err?.message || "").toLowerCase().includes("aborted");

    return NextResponse.json(
      {
        error: isAbort ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNREACHABLE",
        message: isAbort
          ? `Faceswap backend timed out after ${Math.round(
              UPSTREAM_TIMEOUT_MS / 1000
            )}s`
          : `Backend unreachable: ${err?.message || String(err)}`,
        backend: BACKEND,
      },
      { status: isAbort ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }

  const { kind, data, raw } = await readUpstreamBody(backendRes);

  // ✅ If backend returned JSON, return it as-is (even for errors)
  if (kind === "json" && data) {
    // add a little context when upstream failed (helps debugging in UI)
    if (!backendRes.ok) {
      return NextResponse.json(
        {
          ...data,
          upstream: {
            status: backendRes.status,
            backend: BACKEND,
          },
        },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data, { status: backendRes.status });
  }

  // ✅ If backend returned text/HTML, surface it (no more empty {})
  if (!backendRes.ok) {
    return NextResponse.json(
      {
        error: "UPSTREAM_ERROR",
        message: "Faceswap backend returned a non-JSON error response",
        upstream: {
          status: backendRes.status,
          backend: BACKEND,
          contentType: backendRes.headers.get("content-type") || "",
        },
        raw: (raw || "").slice(0, 2000), // keep it bounded
      },
      { status: backendRes.status }
    );
  }

  // ✅ backend success but non-json (rare) → wrap it
  return NextResponse.json(
    {
      success: true,
      raw: (raw || "").slice(0, 2000),
      upstream: {
        status: backendRes.status,
        backend: BACKEND,
        contentType: backendRes.headers.get("content-type") || "",
      },
    },
    { status: 200 }
  );
}
