"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import {
  BILLING_PLANS,
  type BillingKey,
  type PlanKey,
} from "@/app/config/billingPlans";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 12;
const FRESH_WINDOW_MS = 5 * 60 * 1000;

type BillingRecord = {
  id: string;
  credits: number;
  amount: number;
  createdAt: string;
  status?: string | null;
  receiptId?: string | null;
  currency?: string | null;
};

export default function CheckoutCompleteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = (searchParams.get("status") || "").toLowerCase();
  const plan = (searchParams.get("plan") || "").toLowerCase();
  const billing = (searchParams.get("billing") || "").toLowerCase();
  const emailParam = (searchParams.get("email") || "").trim().toLowerCase();
  const receiptParam =
    (searchParams.get("receipt_id") || searchParams.get("payment_id") || "").trim();

  const isSuccess = status === "success" || status === "succeeded";
  const isFailure =
    status === "failed" || status === "error" || status === "cancelled";

  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(isSuccess);
  const [lastRecord, setLastRecord] = useState<BillingRecord | null>(null);
  const [redirected, setRedirected] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [manualCheck, setManualCheck] = useState(false);
  const [verificationTimeout, setVerificationTimeout] = useState(false);
  const [autoRetry, setAutoRetry] = useState(false);
  const [fallbackRequested, setFallbackRequested] = useState(false);
  const [effectiveEmail, setEffectiveEmail] = useState(emailParam);

  const planLabel = useMemo(() => {
    const billingKey = billing as BillingKey;
    const planKey = plan as PlanKey;
    const entry = BILLING_PLANS[billingKey]?.[planKey];
    return entry?.label ?? "Your";
  }, [billing, plan]);

  const billingLabel = useMemo(() => {
    if (billing === "yearly") return "Annual";
    if (billing === "monthly") return "Monthly";
    return "Subscription";
  }, [billing]);

  useEffect(() => {
    if (emailParam) {
      setEffectiveEmail(emailParam);
      return;
    }
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("gx_guest_email") || "";
    if (stored) setEffectiveEmail(stored.trim().toLowerCase());
  }, [emailParam]);

  const pollBilling = async () => {
    try {
      const emailQuery = effectiveEmail
        ? `?email=${encodeURIComponent(effectiveEmail)}`
        : "";
      const res = await fetch(`/api/billing/last${emailQuery}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const last = data?.last ?? null;
      setLastRecord(last);

      if (last?.createdAt && last?.status === "succeeded") {
        const createdAt = new Date(last.createdAt).getTime();
        const isFresh = Date.now() - createdAt < FRESH_WINDOW_MS;
        if (isFresh) {
          setConfirmed(true);
          setChecking(false);
          setVerificationTimeout(false);
          return true;
        }
      }
    } catch {
      // noop
    }
    return false;
  };

  useEffect(() => {
    if (!isSuccess) return;

    let polls = 0;
    let active = true;

    const poll = async () => {
      const ok = await pollBilling();
      if (ok) return;

      polls += 1;
      if (polls >= MAX_POLLS && active) {
        setChecking(false);
        setVerificationTimeout(true);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isSuccess]);

  useEffect(() => {
    if (!manualCheck) return;
    let active = true;
    const run = async () => {
      setChecking(true);
      setVerificationTimeout(false);
      const ok = await pollBilling();
      if (active) {
        setChecking(false);
        setVerificationTimeout(!ok);
      }
      setManualCheck(false);
    };
    run();
    return () => {
      active = false;
    };
  }, [manualCheck]);

  useEffect(() => {
    if (!verificationTimeout || confirmed) return;
    if (autoRetry) return;
    setAutoRetry(true);
    const interval = window.setInterval(async () => {
      if (confirmed) return;
      await pollBilling();
    }, 6000);
    return () => window.clearInterval(interval);
  }, [verificationTimeout, confirmed, autoRetry]);

  useEffect(() => {
    if (!isSuccess || confirmed || fallbackRequested) return;
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: effectiveEmail || undefined,
            plan,
            billing,
            receiptId: receiptParam || lastRecord?.receiptId || undefined,
          }),
        });
        await pollBilling();
      } catch {
        // noop
      } finally {
        setFallbackRequested(true);
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [isSuccess, confirmed, fallbackRequested, effectiveEmail, plan, billing, lastRecord, receiptParam]);

  useEffect(() => {
    if (!confirmed || redirected) return;
    const duration = 5;
    setCountdown(duration);
    const tick = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(tick);
          setRedirected(true);
          window.location.href = "/playground";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [confirmed, redirected, router]);

  const showSuccess = isSuccess;
  const showFailure = isFailure;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060b] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-56 top-[-160px] h-[720px] w-[720px] rounded-full bg-[#7c3aed]/25 blur-[160px]" />
        <div className="absolute -right-56 top-[120px] h-[720px] w-[720px] rounded-full bg-[#4f46e5]/18 blur-[170px]" />
        <div className="absolute left-1/2 top-[35%] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-[190px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/55 to-black" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl items-center px-4 py-16">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl shadow-[0_30px_130px_rgba(0,0,0,0.55)] sm:p-8">
          <div className="flex items-center gap-3">
            {showSuccess ? (
              <CheckCircle2 className="text-emerald-300" size={28} />
            ) : showFailure ? (
              <XCircle className="text-rose-300" size={28} />
            ) : (
              <Loader2 className="animate-spin text-indigo-200" size={28} />
            )}
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                Payment Status
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                {showSuccess
                  ? confirmed
                    ? "Payment confirmed"
                    : "Payment received"
                  : showFailure
                  ? "Payment not completed"
                  : "Processing payment"}
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-white/70">
            {showSuccess
              ? confirmed
                ? `${planLabel} Plan • ${billingLabel} billing is now active.`
                : "We’re confirming your payment with Whop. This usually takes a few seconds."
              : showFailure
              ? "Your payment didn’t go through. You can try again or choose another plan."
              : "Please keep this tab open while we verify your payment."}
          </p>

          {showSuccess && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
              {confirmed
                ? `Credits added: ${lastRecord?.credits ?? "—"}`
                : checking
                ? "Confirming payment and applying credits..."
                : "Payment received. Credits will appear shortly on your billing page."}
              {lastRecord?.receiptId ? ` • Receipt: ${lastRecord.receiptId}` : ""}
            </div>
          )}

          {confirmed && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/70">
              <div className="flex items-center justify-between">
                <span>Redirecting to your workspace</span>
                <span className="font-semibold">{countdown}s</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, (countdown / 5) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => (window.location.href = "/checkout")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/85 transition hover:bg-white/10"
            >
              Manage plan
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/playground")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/20 px-5 py-2.5 text-sm text-white/90 transition hover:bg-indigo-500/30"
            >
              Go to workspace
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/checkout")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
            >
              Choose another plan
            </button>
            {showFailure && (
              <button
                type="button"
                onClick={() =>
                  (window.location.href = `/checkout/failed?plan=${plan}&billing=${billing}`)
                }
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/20 px-5 py-2.5 text-sm text-white/90 transition hover:bg-rose-500/30"
              >
                View failed payment
              </button>
            )}
          </div>

          {verificationTimeout && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/70">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Still verifying your payment. This can take a bit longer with your bank.
                </span>
                <button
                  type="button"
                  onClick={() => setManualCheck(true)}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-white/80 transition hover:bg-white/10"
                >
                  Retry verification
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
