import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function GET(req: Request) {
  const user = await getUserFromCookie(req);

  if (!user) {
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ last: null }, { status: 200 });
    }
    const lookupUser = await prisma.user.findUnique({ where: { email } });
    if (!lookupUser) {
      return NextResponse.json({ last: null }, { status: 200 });
    }
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const last = await prisma.billingHistory.findFirst({
      where: { userId: lookupUser.id, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ last }, { status: 200 });
  }

  const last = await prisma.billingHistory.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ last }, { status: 200 });
}
