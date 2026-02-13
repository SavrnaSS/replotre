import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function GET(req: Request) {
  const user = await getUserFromCookie(req);
  if (!user) {
    return NextResponse.json({ request: null }, { status: 200 });
  }

  const request = await prisma.onboardingChangeRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ request }, { status: 200 });
}

export async function POST(req: Request) {
  const user = await getUserFromCookie(req);
  if (!user) {
    return NextResponse.json({ error: "not-auth" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const message = String(body?.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "missing-message" }, { status: 400 });
  }

  const request = await prisma.onboardingChangeRequest.create({
    data: {
      userId: user.id,
      message,
      status: "pending",
    },
  });

  return NextResponse.json({ request }, { status: 200 });
}
