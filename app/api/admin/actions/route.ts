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
    return NextResponse.json({ actions: [] }, { status: 200 });
  }

  const actions = await prisma.adminAction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ actions }, { status: 200 });
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
  const action = String(body?.action || "").trim();
  const detail = body?.detail ? String(body.detail).trim() : null;
  if (!userId || !action) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const created = await prisma.adminAction.create({
    data: { userId, action, detail, adminId: admin.id },
  });
  publishAdminStream("actions.updated", { userId, action: created });
  return NextResponse.json({ action: created }, { status: 200 });
}
