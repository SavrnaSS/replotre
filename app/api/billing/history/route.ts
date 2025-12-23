import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function GET(req: Request) {
  const user = await getUserFromCookie(req);

  // not logged in -> just return empty history
  if (!user) {
    return NextResponse.json({ history: [] }, { status: 200 });
  }

  const history = await prisma.billingHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ history }, { status: 200 });
}
