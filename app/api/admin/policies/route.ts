import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const policies = await prisma.policyCase.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ policies }, { status: 200 });
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

  const updated = await prisma.policyCase.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ policy: updated }, { status: 200 });
}
