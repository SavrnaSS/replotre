import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function GET(req: Request) {
  const user = await getUserFromCookie(req);

  if (!user) {
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }
    const draft = await prisma.onboardingDraft.findUnique({
      where: { email },
    });
    return NextResponse.json({ profile: draft }, { status: 200 });
  }

  const profile = await prisma.onboardingProfile.findUnique({
    where: { userId: user.id },
  });

  const email = (user.email || "").trim().toLowerCase();
  if (email) {
    const draft = await prisma.onboardingDraft.findUnique({
      where: { email },
    });
    if (!profile && draft) {
      return NextResponse.json({ profile: draft }, { status: 200 });
    }

    const data = profile?.data as Record<string, any> | undefined;
    const isEmpty =
      !data || (typeof data === "object" && Object.keys(data).length === 0);
    if (profile && draft && isEmpty) {
      const updated = await prisma.onboardingProfile.update({
        where: { userId: user.id },
        data: { data: draft.data ?? {} },
      });
      await prisma.onboardingDraft.delete({ where: { email } });
      return NextResponse.json({ profile: updated }, { status: 200 });
    }
  }

  return NextResponse.json({ profile }, { status: 200 });
}
