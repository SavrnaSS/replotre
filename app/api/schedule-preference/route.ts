import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getUserFromCookie } from "@/app/lib/auth";

export async function POST(req: Request) {
  const user = await getUserFromCookie(req);
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const scheduleTime = String(body?.scheduleTime || "").trim();
  const scheduleTimeZone = String(body?.scheduleTimeZone || "").trim();

  if (!scheduleTime) {
    return NextResponse.json({ error: "scheduleTime-required" }, { status: 400 });
  }

  const existing = await prisma.onboardingProfile.findUnique({
    where: { userId: user.id },
  });

  if (existing) {
    const data =
      typeof existing.data === "object" && existing.data ? existing.data : {};
    await prisma.onboardingProfile.update({
      where: { userId: user.id },
      data: {
        data: {
          ...(data as Record<string, any>),
          scheduleTime,
          ...(scheduleTimeZone ? { scheduleTimeZone } : {}),
        },
      },
    });
  } else {
    await prisma.onboardingProfile.create({
      data: {
        userId: user.id,
        data: { scheduleTime, ...(scheduleTimeZone ? { scheduleTimeZone } : {}) },
      },
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
