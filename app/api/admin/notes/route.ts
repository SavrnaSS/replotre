import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { publishAdminStream } from "@/app/lib/adminStream";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const userId = (url.searchParams.get("userId") || "").trim();
  if (!userId) {
    return NextResponse.json({ notes: [] }, { status: 200 });
  }

  const notes = await prisma.adminNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notes }, { status: 200 });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const userId = String(body?.userId || "").trim();
  const note = String(body?.note || "").trim();
  if (!userId || !note) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const created = await prisma.adminNote.create({
    data: {
      userId,
      note,
      authorId: admin.id,
    },
  });
  publishAdminStream("notes.updated", { userId, note: created });
  return NextResponse.json({ note: created }, { status: 200 });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ error: "missing-id" }, { status: 400 });
  }

  await prisma.adminNote.delete({ where: { id } });
  publishAdminStream("notes.updated", { id });
  return NextResponse.json({ ok: true }, { status: 200 });
}
