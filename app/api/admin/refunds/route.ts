import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { publishAdminStream } from "@/app/lib/adminStream";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const refunds = await prisma.refundRequest.findMany({
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ refunds }, { status: 200 });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = String(body?.id || "").trim();
  const status = String(body?.status || "").trim();
  if (!id || !status) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const updated = await prisma.refundRequest.update({
    where: { id },
    data: { status },
  });
  publishAdminStream("refunds.updated", { refund: updated });

  return NextResponse.json({ refund: updated }, { status: 200 });
}
