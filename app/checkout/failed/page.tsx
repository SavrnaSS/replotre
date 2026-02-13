"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle, ArrowRight } from "lucide-react";
import { BILLING_PLANS, type BillingKey, type PlanKey } from "@/app/config/billingPlans";

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams();
  const plan = (searchParams.get("plan") || "pro") as PlanKey;
  const billing = (searchParams.get("billing") || "monthly") as BillingKey;

  const entry = BILLING_PLANS[billing]?.[plan];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070B] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl shadow-[0_30px_130px_rgba(0,0,0,0.55)] sm:p-8">
          <div className="flex items-center gap-3">
            <XCircle className="text-rose-300" size={28} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                Payment Status
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Payment failed</h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-white/70">
            Your payment didn’t go through. Please try again or choose another
            plan.
          </p>

          {entry && (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
              {entry.label} • {billing} • ${entry.price}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/checkout?plan=${plan}&billing=${billing}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/85 transition hover:bg-white/10"
            >
              Try again
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/checkout"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/20 px-5 py-2.5 text-sm text-white/90 transition hover:bg-indigo-500/30"
            >
              Choose another plan
            </Link>
            <Link
              href="/workspace"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
            >
              Back to workspace
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
