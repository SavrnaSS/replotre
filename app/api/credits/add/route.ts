// app/api/credits/add/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { verifyToken } from "@/app/lib/auth";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";

  if (!cookie.includes("mitux_session="))
    return NextResponse.json({ error: "not-auth" });

  const token = cookie.split("mitux_session=")[1].split(";")[0];
  const decoded: any = verifyToken(token);

  const { amount } = await req.json();

  const user = await prisma.user.update({
    where: { id: decoded.userId },
    data: { credits: { increment: amount } },
  });

  return NextResponse.json({ credits: user.credits });
}
