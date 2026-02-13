import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function POST(req: Request) {
  const user = await getUserFromCookie(req);
  if (!user?.email) {
    return NextResponse.json({ error: "not-auth" }, { status: 401 });
  }

  const email = user.email.trim().toLowerCase();
  const draft = await prisma.onboardingDraft.findUnique({
    where: { email },
  });
  if (!draft) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  const profile = await prisma.onboardingProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      data: draft.data ?? {},
      plan: draft.plan ?? null,
      billing: draft.billing ?? null,
    },
    update: {
      data: draft.data ?? {},
      plan: draft.plan ?? null,
      billing: draft.billing ?? null,
    },
  });

  await prisma.onboardingDraft.delete({ where: { email } });

  return NextResponse.json({ profile }, { status: 200 });
}
