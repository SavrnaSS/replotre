import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function POST(req: Request) {
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const name = typeof payload?.name === "string" ? payload.name : "";
  if (!name) {
    return NextResponse.json({ error: "missing-name" }, { status: 400 });
  }

  const user = await getUserFromCookie(req);
  const meta = payload?.payload ?? null;

  await prisma.analyticsEvent.create({
    data: {
      name,
      payload: meta,
      userId: user?.id ?? null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
