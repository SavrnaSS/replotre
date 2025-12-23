// app/api/credits/get/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { verifyToken } from "@/app/lib/auth";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";

  if (!cookie.includes("mitux_session="))
    return NextResponse.json({ credits: 0 });

  const token = cookie.split("mitux_session=")[1].split(";")[0];
  const decoded: any = verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  return NextResponse.json({ credits: user?.credits || 0 });
}
