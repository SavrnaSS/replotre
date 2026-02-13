import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromCookie } from "@/app/lib/auth";

const MONTHLY_GRACE_DAYS = 40;
const YEARLY_GRACE_DAYS = 380;

function isActiveBillingWindow(last: { billing?: string | null; createdAt?: Date }) {
  if (!last?.createdAt) return false;
  const billing = String(last.billing || "").toLowerCase();
  const days = billing === "yearly" ? YEARLY_GRACE_DAYS : MONTHLY_GRACE_DAYS;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return last.createdAt.getTime() >= cutoff;
}

export async function GET(req: Request) {
  const user = await getUserFromCookie(req);

  if (!user) {
    return NextResponse.json({ active: false }, { status: 401 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (subscription) {
    const active = subscription.status === "Active";
    return NextResponse.json(
      {
        active,
        plan: subscription.plan ?? null,
        billing: subscription.billing ?? null,
        status: subscription.status ?? null,
        createdAt: subscription.createdAt ?? null,
      },
      { status: 200 }
    );
  }

  const last = await prisma.billingHistory.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const active =
    Boolean(last?.plan || last?.billing) &&
    String(last?.status || "").toLowerCase() === "succeeded" &&
    isActiveBillingWindow(last || {});

  return NextResponse.json(
    {
      active,
      plan: last?.plan ?? null,
      billing: last?.billing ?? null,
      status: last?.status ?? null,
      createdAt: last?.createdAt ?? null,
    },
    { status: 200 }
  );
}
