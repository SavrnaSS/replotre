// app/api/credits/use/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { verifyToken } from "@/app/lib/auth";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";

  if (!cookie.includes("mitux_session="))
    return NextResponse.json({ error: "not-auth" }, { status: 401 });

  const token = cookie.split("mitux_session=")[1]?.split(";")[0];

  if (!token) return NextResponse.json({ error: "invalid-token" }, { status: 401 });

  let decoded: any;
  try {
    decoded = verifyToken(token);
  } catch {
    return NextResponse.json({ error: "invalid-token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (user.credits <= 0)
    return NextResponse.json({ error: "no-credit" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { credits: { decrement: 1 } },
  });

  return NextResponse.json({ credits: updated.credits });
}
