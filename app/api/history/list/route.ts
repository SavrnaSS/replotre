import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

export async function GET(req: Request) {
  const user = await getUserFromCookie(req);
  if (!user) return NextResponse.json({ history: [] });

  const history = await prisma.history.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ history });
}
