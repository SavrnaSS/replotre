import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const userId = (url.searchParams.get("userId") || "").trim();

  const history = await prisma.billingHistory.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json({ history }, { status: 200 });
}
