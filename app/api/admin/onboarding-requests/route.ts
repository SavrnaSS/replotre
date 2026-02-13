import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { publishAdminStream } from "@/app/lib/adminStream";

export async function GET(req: Request) {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const requests = await prisma.onboardingChangeRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ requests }, { status: 200 });
}

export async function POST(req: Request) {
  const user = await requireAdmin(req);
  if (!user) {
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

  const updated = await prisma.onboardingChangeRequest.update({
    where: { id },
    data: { status },
  });
  publishAdminStream("requests.updated", { request: updated });

  return NextResponse.json({ request: updated }, { status: 200 });
}
