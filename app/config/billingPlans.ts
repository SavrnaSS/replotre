export type BillingKey = "monthly" | "yearly";
export type PlanKey = "basic" | "pro" | "elite";

export type BillingPlan = {
  key: PlanKey;
  label: string;
  desc: string;
  price: number;
  priceCents: number;
  credits: number;
  highlight?: boolean;
  whopPlanId?: string;
};

type BillingPlanMap = Record<PlanKey, BillingPlan>;

export const BILLING_PLANS: Record<BillingKey, BillingPlanMap> = {
  monthly: {
    basic: {
      key: "basic",
      label: "Basic",
      desc: "Starter credits",
      price: 15,
      priceCents: 1500,
      credits: 500,
      whopPlanId: process.env.NEXT_PUBLIC_WHOP_PLAN_ID_BASIC_MONTHLY,
    },
    pro: {
      key: "pro",
      label: "Pro",
      desc: "Most popular",
      price: 29,
      priceCents: 2900,
      credits: 1000,
      highlight: true,
      whopPlanId: process.env.NEXT_PUBLIC_WHOP_PLAN_ID_PRO_MONTHLY,
    },
    elite: {
      key: "elite",
      label: "Elite",
      desc: "Unlimited power",
      price: 79,
      priceCents: 7900,
      credits: 4000,
      whopPlanId: process.env.NEXT_PUBLIC_WHOP_PLAN_ID_ELITE_MONTHLY,
    },
  },
  yearly: {
    basic: {
      key: "basic",
      label: "Basic",
      desc: "Billed yearly",
      price: 2.99,
      priceCents: 299,
      credits: 500,
      whopPlanId: process.env.NEXT_PUBLIC_WHOP_PLAN_ID_BASIC_YEARLY,
    },
    pro: {
      key: "pro",
      label: "Pro",
      desc: "Best value",
      price: 7.99,
      priceCents: 799,
      credits: 1000,
      highlight: true,
      whopPlanId: process.env.NEXT_PUBLIC_WHOP_PLAN_ID_PRO_YEARLY,
    },
    elite: {
      key: "elite",
      label: "Elite",
      desc: "Premium tier",
      price: 15.99,
      priceCents: 1599,
      credits: 4000,
      whopPlanId: process.env.NEXT_PUBLIC_WHOP_PLAN_ID_ELITE_YEARLY,
    },
  },
};

export const PLAN_KEYS: PlanKey[] = ["basic", "pro", "elite"];
export const BILLING_KEYS: BillingKey[] = ["monthly", "yearly"];

export const getPlanConfig = (billing: BillingKey, plan: PlanKey) =>
  BILLING_PLANS[billing][plan];

export const getPlanId = (billing: BillingKey, plan: PlanKey) =>
  BILLING_PLANS[billing][plan].whopPlanId || process.env.NEXT_PUBLIC_WHOP_PLAN_ID;

export const findPlanById = (planId?: string) => {
  if (!planId) return null;
  for (const billing of BILLING_KEYS) {
    for (const plan of PLAN_KEYS) {
      const entry = BILLING_PLANS[billing][plan];
      if (entry.whopPlanId === planId) {
        return { billing, plan, entry };
      }
    }
  }
  return null;
};
