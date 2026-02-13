"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Check } from "lucide-react";
import { BILLING_PLANS } from "@/app/config/billingPlans";

type OnboardingProfile = {
  plan?: string | null;
  billing?: string | null;
};

type BillingRecord = {
  id: string;
  amount: number;
  status?: string | null;
  plan?: string | null;
  billing?: string | null;
  createdAt: string;
};

export default function SubscriptionPage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingMode, setBillingMode] = useState<"monthly" | "yearly">("monthly");
  const [changeMessage, setChangeMessage] = useState("");
  const [changeRequest, setChangeRequest] = useState<any | null>(null);
  const [submittingChange, setSubmittingChange] = useState(false);
  const requestRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [profileRes, meRes, historyRes, requestRes] = await Promise.all([
          fetch("/api/onboarding/status", { cache: "no-store" }),
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/billing/history", { cache: "no-store" }),
          fetch("/api/onboarding/change-request", { cache: "no-store" }),
        ]);
        const profileData = await profileRes.json();
        const meData = await meRes.json();
        const historyData = await historyRes.json();
        const requestData = await requestRes.json();
        if (active) {
          setProfile(profileData?.profile ?? null);
          setCredits(meData?.user?.credits ?? null);
          setHistory(historyData?.history ?? []);
          setChangeRequest(requestData?.request ?? null);
          const mode =
            (profileData?.profile?.billing || "").toLowerCase() === "yearly"
              ? "yearly"
              : "monthly";
          setBillingMode(mode);
        }
      } catch {
        if (active) {
          setProfile(null);
          setCredits(null);
          setHistory([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const submitChangeRequest = async () => {
    const message = changeMessage.trim();
    if (!message) return;
    setSubmittingChange(true);
    try {
      const res = await fetch("/api/onboarding/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data?.request) {
        setChangeRequest(data.request);
        setChangeMessage("");
      }
    } catch {
      // noop
    } finally {
      setSubmittingChange(false);
    }
  };

  const requestPlanChange = (message: string) => {
    setChangeMessage(message);
    window.setTimeout(() => {
      requestRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const activePlan = (profile?.plan || "").toLowerCase();
  const activeBilling = (profile?.billing || "").toLowerCase();

  const activeEntry = useMemo(() => {
    const billingKey = activeBilling === "yearly" ? "yearly" : "monthly";
    const planKey = (activePlan || "basic") as keyof typeof BILLING_PLANS.monthly;
    const table = BILLING_PLANS[billingKey];
    return table?.[planKey] ?? null;
  }, [activeBilling, activePlan]);

  const latestInvoice = useMemo(() => {
    if (!history.length) return null;
    return history.reduce((latest, item) => {
      if (!latest) return item;
      return new Date(item.createdAt).getTime() > new Date(latest.createdAt).getTime()
        ? item
        : latest;
    }, history[0] as BillingRecord | null);
  }, [history]);

  const plans = useMemo(() => {
    const table =
      billingMode === "yearly" ? BILLING_PLANS.yearly : BILLING_PLANS.monthly;
    return Object.values(table).map((entry) => ({
      key: entry.key,
      label: entry.label,
      price: entry.price,
      credits: entry.credits,
    }));
  }, [billingMode]);

  const savingsPct = (planKey: string) => {
    const monthly = BILLING_PLANS.monthly[planKey as keyof typeof BILLING_PLANS.monthly];
    const yearly = BILLING_PLANS.yearly[planKey as keyof typeof BILLING_PLANS.yearly];
    if (!monthly || !yearly) return 0;
    const monthlyAnnual = monthly.price * 12;
    if (monthlyAnnual <= 0) return 0;
    const savings = Math.round(((monthlyAnnual - yearly.price) / monthlyAnnual) * 100);
    return Math.max(0, savings);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070B] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10"
          >
            <ArrowLeft size={14} /> Back to playground
          </Link>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-black/30 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20">
                <Calendar size={18} className="text-indigo-200" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Creator billing
                </p>
                <h1 className="text-2xl font-semibold">Manage plan</h1>
                <p className="mt-1 text-xs text-white/55">
                  Production-grade billing controls for your creator studio.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/65">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Status: <span className="font-semibold text-white/85">Active</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Plan:{" "}
                <span className="font-semibold text-white/85">
                  {activeEntry?.label || profile?.plan || "—"}
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Billing:{" "}
                <span className="font-semibold text-white/85">
                  {activeBilling || "monthly"}
                </span>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-white/60">Loading plan…</div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Current plan
                  </p>
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-2xl font-semibold">
                        {activeEntry?.label || profile?.plan || "—"} Plan
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        {activeEntry ? `$${activeEntry.price}` : "—"} /{" "}
                        {activeBilling === "yearly" ? "year" : "month"} •{" "}
                        {activeEntry?.credits ?? "—"} credits
                      </p>
                      <p className="mt-2 text-xs text-white/50">
                        SLA-backed creator delivery • Priority studio queue
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/65">
                      Credits available:{" "}
                      <span className="font-semibold text-white/85">
                        {credits ?? "—"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      Billing cycle:{" "}
                      <span className="font-semibold text-white/85">
                        {activeBilling || "monthly"}
                      </span>
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      Renewal:{" "}
                      <span className="font-semibold text-white/85">Auto</span>
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      Status:{" "}
                      <span className="font-semibold text-emerald-200">Active</span>
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Billing overview
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-white/70">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                      <span>Last invoice</span>
                      <span className="font-semibold text-white/85">
                        {latestInvoice
                          ? new Date(latestInvoice.createdAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                      <span>Last charge</span>
                      <span className="font-semibold text-white/85">
                        {latestInvoice ? `$${(latestInvoice.amount / 100).toFixed(2)}` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                      <span>Payment method</span>
                      <span className="font-semibold text-white/85">Card on file</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      requestPlanChange("Update payment method for my creator studio billing.")
                    }
                    className="mt-4 w-full rounded-full border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-sm text-white/90 transition hover:bg-indigo-500/30"
                  >
                    Request billing update
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Plans
                </p>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs text-white/70">
                    <button
                      type="button"
                      onClick={() => setBillingMode("monthly")}
                      className={`rounded-full px-3 py-1 transition ${
                        billingMode === "monthly"
                          ? "bg-white/15 text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingMode("yearly")}
                      className={`rounded-full px-3 py-1 transition ${
                        billingMode === "yearly"
                          ? "bg-white/15 text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {plans.map((plan) => {
                    const isActive =
                      plan.key === activePlan && billingMode === activeBilling;
                    return (
                      <div
                        key={plan.key}
                        className={`rounded-2xl border p-4 ${
                          isActive
                            ? "border-indigo-300/40 bg-indigo-500/10"
                            : "border-white/10 bg-black/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{plan.label}</p>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">
                              <Check size={12} /> Active
                            </span>
                          )}
                          {billingMode === "yearly" && savingsPct(plan.key) > 0 && (
                            <span className="rounded-full border border-indigo-300/30 bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-100">
                              Save {savingsPct(plan.key)}%
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-2xl font-semibold">${plan.price}</p>
                        <p className="mt-1 text-xs text-white/50">
                          {plan.credits} credits / {billingMode === "yearly" ? "year" : "month"}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            requestPlanChange(
                              `Request plan change to ${plan.label} (${billingMode}).`
                            )
                          }
                          disabled={isActive}
                          className={`mt-4 w-full rounded-full border px-3 py-2 text-xs transition ${
                            isActive
                              ? "border-white/10 bg-black/40 text-white/40"
                              : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                          }`}
                        >
                          {isActive ? "Current plan" : "Request this plan"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Billing history
              </p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/25">
                  {history.length === 0 ? (
                    <div className="p-4 text-sm text-white/60">No invoices yet.</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {history.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-4 py-3 text-sm text-white/80"
                        >
                          <div>
                            <div className="font-medium">
                              {item.plan || "Plan"} • {item.billing || "billing"}
                            </div>
                            <div className="text-xs text-white/45">
                              {new Date(item.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              ${(item.amount / 100).toFixed(2)}
                            </div>
                            <div className="text-xs text-white/45">
                              {item.status || "succeeded"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div
            ref={requestRef}
            className="mt-6 rounded-2xl border border-indigo-300/25 bg-indigo-500/10 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/80">
                  Need a plan change, billing update, or credit top‑up?
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Submit a request and our billing team will take care of it.
                </p>
              </div>
            </div>
            {changeRequest?.status && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
                Latest request:{" "}
                <span className="font-semibold">{changeRequest.status}</span>
              </div>
            )}
            <textarea
              value={changeMessage}
              onChange={(e) => setChangeMessage(e.target.value)}
              rows={3}
              placeholder="Describe your requested plan or billing change."
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80 outline-none placeholder:text-white/35 focus:border-indigo-300/50"
            />
            <button
              type="button"
              disabled={submittingChange || !changeMessage.trim()}
              onClick={submitChangeRequest}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/20 px-4 py-2 text-sm text-white/90 transition hover:bg-indigo-500/30 disabled:opacity-50"
            >
              {submittingChange ? "Sending..." : "Submit request"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
