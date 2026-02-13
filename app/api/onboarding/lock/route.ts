import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function POST(req: Request) {
  const user = await getUserFromCookie(req);
  if (!user) {
    return NextResponse.json({ error: "not-auth" }, { status: 401 });
  }

  const profile = await prisma.onboardingProfile.update({
    where: { userId: user.id },
    data: { allowEdit: false },
  });

  return NextResponse.json({ profile }, { status: 200 });
}
