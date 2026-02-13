import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getUserFromCookie } from "@/app/lib/auth";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromCookie(req);
    if (!user?.id) {
      return NextResponse.json({ error: "not-auth" }, { status: 401 });
    }

    const body = asRecord(await req.json().catch(() => ({})));
    const resultUrl = String(body.resultUrl || "").trim();
    const prompt = String(body.prompt || "").trim();
    const type = String(body.type || "txt2img").trim();

    if (!resultUrl) {
      return NextResponse.json({ error: "missing-result-url" }, { status: 400 });
    }

    const history = await prisma.history.create({
      data: {
        userId: user.id,
        type,
        resultUrl,
        prompt: prompt || null,
      },
    });

    return NextResponse.json({ ok: true, history }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    const dbUnavailable =
      message.includes("PrismaClientInitializationError") ||
      message.includes("Can't reach database server");

    if (dbUnavailable) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    return NextResponse.json({ error: "history-save-failed" }, { status: 500 });
  }
}
