import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function POST(req: Request) {
  const user = await getUserFromCookie(req);

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const data = payload?.data ?? {};
  const plan = payload?.plan ?? null;
  const billing = payload?.billing ?? null;
  const completed = Boolean(payload?.completed);
  const email =
    typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!user) {
    if (!email) {
      return NextResponse.json({ error: "not-auth" }, { status: 401 });
    }

    const draft = await prisma.onboardingDraft.upsert({
      where: { email },
      create: {
        email,
        data,
        plan,
        billing,
      },
      update: {
        data,
        plan,
        billing,
      },
    });

    return NextResponse.json({ draft }, { status: 200 });
  }

  const profile = await prisma.onboardingProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      data,
      plan,
      billing,
      completedAt: completed ? new Date() : null,
      allowEdit: completed ? false : undefined,
    },
    update: {
      data,
      plan,
      billing,
      completedAt: completed ? new Date() : undefined,
      allowEdit: completed ? false : undefined,
    },
  });

  return NextResponse.json({ profile }, { status: 200 });
}
