import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getUserFromCookie } from "@/app/lib/auth";
import { getPlanConfig } from "@/app/config/billingPlans";

export async function POST(req: Request) {
  const user = await getUserFromCookie(req);
  const body = await req.json().catch(() => ({}));

  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const plan = String(body?.plan || "").toLowerCase();
  const billing = String(body?.billing || "").toLowerCase();
  const receiptId = String(body?.receiptId || "").trim();

  const lookupEmail = user?.email || email;
  if (!lookupEmail) {
    return NextResponse.json({ error: "missing-email" }, { status: 400 });
  }

  const existing = await prisma.billingHistory.findFirst({
    where: {
      receiptId: receiptId || undefined,
    },
  });
  if (existing) {
    return NextResponse.json({ last: existing }, { status: 200 });
  }

  let lookupUser = user;
  if (!lookupUser) {
    lookupUser = await prisma.user.findUnique({ where: { email: lookupEmail } });
  }

  if (!lookupUser) {
    lookupUser = await prisma.user.create({
      data: {
        email: lookupEmail,
        name: lookupEmail.split("@")[0] || "Customer",
        authProvider: "whop",
        passwordHash: null,
        credits: 0,
      },
    });
  }

  let amount = 0;
  let credits = 0;
  if (plan && billing) {
    try {
      const meta = getPlanConfig(billing as any, plan as any);
      amount = meta?.priceCents ?? 0;
      credits = meta?.credits ?? 0;
    } catch {
      // ignore
    }
  }

  const last = await prisma.billingHistory.create({
    data: {
      userId: lookupUser.id,
      credits,
      amount,
      status: "succeeded",
      plan: plan || null,
      billing: billing || null,
      receiptId: receiptId || null,
      currency: "usd",
      provider: "whop-fallback",
      webhookId: `fallback_${receiptId || crypto.randomUUID()}`,
    },
  });

  const existingProfile = await prisma.onboardingProfile.findUnique({
    where: { userId: lookupUser.id },
  });

  await prisma.onboardingProfile.upsert({
    where: { userId: lookupUser.id },
    create: {
      userId: lookupUser.id,
      data: existingProfile?.data ?? {},
      plan: plan || null,
      billing: billing || null,
      completedAt: new Date(),
      allowEdit: false,
    },
    update: {
      ...(existingProfile?.data ? { data: existingProfile.data } : {}),
      plan: plan || null,
      billing: billing || null,
      completedAt: new Date(),
      allowEdit: false,
    },
  });

  return NextResponse.json({ last }, { status: 200 });
}
