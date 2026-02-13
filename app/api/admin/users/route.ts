import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      onboardingProfile: true,
      subscriptions: true,
    },
  });

  return NextResponse.json({ users }, { status: 200 });
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

  const updated = await prisma.user.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ user: updated }, { status: 200 });
}
