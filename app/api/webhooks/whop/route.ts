import crypto from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { findPlanById } from "@/app/config/billingPlans";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function parseSignatureHeader(header: string) {
  return header
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.includes(",")) {
        const [version, sig] = part.split(",", 2);
        return { version, sig };
      }
      if (part.includes("=")) {
        const [version, sig] = part.split("=", 2);
        return { version, sig };
      }
      return { version: "v1", sig: part };
    })
    .filter((entry) => entry.sig);
}

function isValidSignature({
  payload,
  webhookId,
  timestamp,
  signatureHeader,
  secret,
}: {
  payload: string;
  webhookId: string;
  timestamp: string;
  signatureHeader: string;
  secret: string;
}) {
  const signatures = parseSignatureHeader(signatureHeader);
  const signedPayload = `${webhookId}.${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("base64");

  return signatures.some(
    (entry) =>
      entry.version === "v1" && timingSafeEqual(entry.sig, expected)
  );
}

export async function POST(req: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const webhookId = req.headers.get("webhook-id") || "";
  const timestamp = req.headers.get("webhook-timestamp") || "";
  const signatureHeader = req.headers.get("webhook-signature") || "";

  if (!webhookId || !timestamp || !signatureHeader) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampNumber);
  if (ageSeconds > MAX_CLOCK_SKEW_SECONDS) {
    return NextResponse.json({ error: "Stale webhook" }, { status: 400 });
  }

  const valid = isValidSignature({
    payload,
    webhookId,
    timestamp,
    signatureHeader,
    secret,
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType =
    event?.type || event?.event || event?.name || event?.data?.type || "";
  const isPaymentSucceeded =
    eventType === "payment.succeeded" || eventType === "payment_succeeded";
  const isPaymentFailed =
    eventType === "payment.failed" ||
    eventType === "payment_failed" ||
    eventType === "payment.error" ||
    eventType === "payment_error";
  if (!isPaymentSucceeded) {
    if (!isPaymentFailed) {
      console.info("[whop] ignored event", { eventType, webhookId });
      return NextResponse.json({ received: true });
    }
  }

  const planId =
    event?.data?.plan_id ||
    event?.data?.planId ||
    event?.data?.plan?.id ||
    "";
  const email =
    event?.data?.customer?.email ||
    event?.data?.email ||
    event?.data?.user?.email ||
    "";
  const receiptId =
    event?.data?.receipt_id ||
    event?.data?.setup_intent_id ||
    event?.data?.payment_id ||
    event?.data?.id ||
    "";
  const amount =
    event?.data?.amount_cents ||
    event?.data?.amount ||
    event?.data?.total ||
    0;
  const currency =
    event?.data?.currency || event?.data?.currency_code || "usd";

  if (!email || (!planId && isPaymentSucceeded)) {
    console.info("[whop] missing email/plan", {
      eventType,
      webhookId,
      hasEmail: Boolean(email),
      hasPlanId: Boolean(planId),
    });
    return NextResponse.json({ received: true });
  }

  const match = findPlanById(planId);
  if (!match && isPaymentSucceeded) {
    console.info("[whop] unknown plan id", { eventType, webhookId, planId });
    return NextResponse.json({ received: true });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const name =
      event?.data?.customer?.name ||
      event?.data?.user?.name ||
      email.split("@")[0] ||
      "Customer";
    user = await prisma.user.create({
      data: {
        email,
        name,
        authProvider: "whop",
        passwordHash: null,
        credits: 0,
      },
    });
  }

  const draft =
    (prisma as any).onboardingDraft?.findUnique
      ? await (prisma as any).onboardingDraft.findUnique({ where: { email } })
      : null;

  if (webhookId) {
    const existing = await prisma.billingHistory.findUnique({
      where: { webhookId },
    });
    if (existing) {
      console.info("[whop] duplicate webhook ignored", { webhookId });
      return NextResponse.json({ received: true });
    }
  }

  const isSuccess = isPaymentSucceeded;
  const creditsToApply = isSuccess ? match?.entry.credits ?? 0 : 0;
  const amountCents =
    typeof amount === "number" && Number.isFinite(amount) && amount > 0
      ? amount
      : isSuccess
      ? match?.entry.priceCents ?? 0
      : 0;

  const tx = [
    prisma.billingHistory.create({
      data: {
        userId: user.id,
        credits: creditsToApply,
        amount: amountCents,
        status: isSuccess ? "succeeded" : "failed",
        planId: planId || null,
        plan: match?.plan ?? null,
        billing: match?.billing ?? null,
        receiptId: receiptId || null,
        currency: currency || null,
        provider: "whop",
        webhookId: webhookId || null,
      },
    }),
  ];

  if (isSuccess && creditsToApply > 0) {
    tx.unshift(
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: creditsToApply } },
      })
    );
  }

  tx.push(
    prisma.onboardingProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        data: draft?.data ?? {},
        plan: match?.plan ?? draft?.plan ?? null,
        billing: match?.billing ?? draft?.billing ?? null,
        completedAt: new Date(),
        allowEdit: false,
      },
      update: {
        ...(draft?.data ? { data: draft.data } : {}),
        plan: match?.plan ?? draft?.plan ?? null,
        billing: match?.billing ?? draft?.billing ?? null,
        completedAt: new Date(),
        allowEdit: false,
      },
    })
  );

  if (draft && (prisma as any).onboardingDraft?.delete) {
    tx.push(
      (prisma as any).onboardingDraft.delete({
        where: { email },
      })
    );
  }

  await prisma.$transaction(tx);

  console.info("[whop] payment recorded", {
    eventType,
    webhookId,
    userId: user.id,
    planId,
    billing: match?.billing,
    plan: match?.plan,
    credits: creditsToApply,
  });

  return NextResponse.json({ received: true });
}
