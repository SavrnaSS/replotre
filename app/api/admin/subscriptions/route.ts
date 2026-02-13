import crypto from "node:crypto";
import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { BILLING_PLANS } from "@/app/config/billingPlans";
import { publishAdminStream } from "@/app/lib/adminStream";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ subscriptions }, { status: 200 });
}

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

  const id = String(body?.id || "").trim();
  const status = String(body?.status || "").trim();
  const userId = String(body?.userId || "").trim();
  const plan = String(body?.plan || "").toLowerCase();
  const billing = String(body?.billing || "").toLowerCase();
  const action = String(body?.action || "").toLowerCase();

  if (id && status) {
    const updated = await prisma.subscription.update({
      where: { id },
      data: { status },
    });
    publishAdminStream("subscription.status", {
      id,
      status,
      userId: updated.userId,
      subscription: updated,
    });
    return NextResponse.json({ subscription: updated }, { status: 200 });
  }

  if (!userId || (!action && (!plan || !billing))) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const now = new Date();
  const billingKey = billing === "yearly" ? "yearly" : "monthly";
  const planKey = (plan || "basic") as keyof typeof BILLING_PLANS.monthly;
  const config = BILLING_PLANS[billingKey]?.[planKey];

  if ((action === "set" || action === "add") && !config) {
    return NextResponse.json({ error: "invalid-plan" }, { status: 400 });
  }

  if (action === "cancel") {
    await prisma.subscription.updateMany({
      where: { userId },
      data: { status: "Cancelled" },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.onboardingProfile.upsert({
      where: { userId },
      create: {
        userId,
        data: {},
        plan: null,
        billing: null,
        allowEdit: true,
        completedAt: null,
      },
      update: {
        plan: null,
        billing: null,
        allowEdit: true,
        completedAt: null,
      },
    });

    if (user?.email) {
      await prisma.onboardingDraft.deleteMany({
        where: { email: user.email },
      });
    }

    const history = await prisma.billingHistory.create({
      data: {
        userId,
        credits: 0,
        amount: 0,
        status: "cancelled",
        plan: null,
        billing: null,
        provider: "admin",
        currency: "usd",
        webhookId: `admin_cancel_${crypto.randomUUID()}`,
      },
    });
    publishAdminStream("subscription.cancelled", {
      userId,
      status: "Cancelled",
      history,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const amount = config?.priceCents ?? 0;
  const credits = config?.credits ?? 0;
  const nextChargeAt =
    billingKey === "yearly"
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const existing = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan: planKey,
          billing: billingKey,
          amount,
          status: "Active",
          startedAt: now,
          nextChargeAt,
        },
      })
    : await prisma.subscription.create({
        data: {
          userId,
          plan: planKey,
          billing: billingKey,
          amount,
          status: "Active",
          startedAt: now,
          nextChargeAt,
        },
      });

  await prisma.onboardingProfile.upsert({
    where: { userId },
    create: {
      userId,
      data: {},
      plan: planKey,
      billing: billingKey,
      completedAt: now,
      allowEdit: false,
    },
    update: {
      plan: planKey,
      billing: billingKey,
      completedAt: now,
      allowEdit: false,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: Math.max(user.credits, credits) },
    });
  }

  const history = await prisma.billingHistory.create({
    data: {
      userId,
      credits,
      amount,
      status: "admin",
      plan: planKey,
      billing: billingKey,
      provider: "admin",
      currency: "usd",
      webhookId: `admin_set_${crypto.randomUUID()}`,
    },
  });

  publishAdminStream("subscription.updated", {
    userId,
    plan: planKey,
    billing: billingKey,
    status: "Active",
    subscription,
    history,
  });

  return NextResponse.json({ subscription }, { status: 200 });
}
