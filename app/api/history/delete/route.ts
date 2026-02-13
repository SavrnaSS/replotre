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
    const historyId = String(body.historyId || "").trim();
    const resultUrl = String(body.resultUrl || "").trim();

    if (!historyId && !resultUrl) {
      return NextResponse.json({ error: "missing-delete-selector" }, { status: 400 });
    }

    if (historyId) {
      await prisma.history.deleteMany({
        where: { id: historyId, userId: user.id },
      });
      return NextResponse.json({ ok: true, deletedBy: "historyId" }, { status: 200 });
    }

    const deleted = await prisma.history.deleteMany({
      where: { userId: user.id, resultUrl },
    });

    return NextResponse.json(
      { ok: true, deletedBy: "resultUrl", count: deleted.count },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    const dbUnavailable =
      message.includes("PrismaClientInitializationError") ||
      message.includes("Can't reach database server");

    if (dbUnavailable) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }

    return NextResponse.json({ error: "history-delete-failed" }, { status: 500 });
  }
}
