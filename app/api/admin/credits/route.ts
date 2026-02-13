import crypto from "node:crypto";
import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { publishAdminStream } from "@/app/lib/adminStream";

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userId = String(body?.userId || "").trim();
  const delta = Number(body?.delta || 0);
  const reason = String(body?.reason || "").trim();
  if (!userId || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "invalid-fields" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: Math.floor(delta) } },
  });

  const history = await prisma.billingHistory.create({
    data: {
      userId,
      credits: Math.floor(delta),
      amount: 0,
      status: "admin_adjustment",
      plan: null,
      billing: null,
      provider: "admin",
      currency: "usd",
      receiptId: reason || null,
      webhookId: `admin_credit_${crypto.randomUUID()}`,
    },
  });

  await prisma.adminAction.create({
    data: {
      userId,
      adminId: admin.id,
      action: "credits_adjustment",
      detail: `${delta >= 0 ? "+" : ""}${delta} credits${reason ? ` • ${reason}` : ""}`,
    },
  });

  publishAdminStream("credits.updated", {
    userId,
    delta,
    credits: updated.credits,
    history,
  });

  return NextResponse.json({ user: updated }, { status: 200 });
}
