// app/billing/page.tsx
"use client";

import useAuth from "@/app/hooks/useAuth";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AnimatedButton from "@/app/components/AnimatedButton";
import {
  CreditCard,
  History,
  LogOut,
  ArrowLeft,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";

interface BillingRecord {
  id: string;
  credits: number;
  amount: number;
  createdAt: string;
}

type Pack = { c: number; p: number; badge?: string; desc?: string };

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function formatINR(n: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}

function safeSetSelectedPack(pack: Pack) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "mitux_selected_pack",
      JSON.stringify({ c: pack.c, p: pack.p })
    );
  } catch {}
}

function safeGetSelectedPack(): { c?: number; p?: number } | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("mitux_selected_pack");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * ✅ IMPORTANT FIX:
 * Next.js requires useSearchParams() to be wrapped in a <Suspense> boundary.
 * So we split the page into:
 * - BillingPage (Suspense wrapper)
 * - BillingPageInner (contains useSearchParams + all existing logic)
 */
export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D0D0F] text-white px-4 sm:px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6">
              <p className="text-white/60 text-sm">Loading billing...</p>
            </div>
          </div>
        </div>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const { user, refresh } = useAuth();
  const credits = user?.credits ?? 0;

  const searchParams = useSearchParams();

  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuying, setIsBuying] = useState<number | null>(null);

  const packs: Pack[] = useMemo(
    () => [
      { c: 3, p: 199, badge: "Starter", desc: "Try it out" },
      { c: 10, p: 499, badge: "Most popular", desc: "Best value" },
      { c: 30, p: 999, badge: "Pro", desc: "For power users" },
    ],
    []
  );

  // Selected pack
  const [selectedCredits, setSelectedCredits] = useState<number>(() => 10);

  // ✅ Sync selection from query OR localStorage
  useEffect(() => {
    const qpPack = Number(searchParams?.get("pack") || "");
    const qpPrice = Number(searchParams?.get("price") || "");

    // 1) Query param wins
    if (qpPack && packs.some((x) => x.c === qpPack)) {
      setSelectedCredits(qpPack);

      // Persist correct pack (ignore qpPrice if wrong; use canonical list)
      const canonical = packs.find((x) => x.c === qpPack)!;
      safeSetSelectedPack(canonical);
      return;
    }

    // (Optional) if someone passes only price, we ignore it safely
    if (qpPrice) {
      // no-op
    }

    // 2) Then localStorage
    const saved = safeGetSelectedPack();
    if (saved?.c && packs.some((x) => x.c === saved.c)) {
      setSelectedCredits(saved.c);
      return;
    }

    // 3) Default
    setSelectedCredits(10);
    safeSetSelectedPack(packs.find((x) => x.c === 10) || packs[0]);
  }, [packs, searchParams]);

  const selectedPack = useMemo(() => {
    return packs.find((p) => p.c === selectedCredits) ?? packs[1] ?? packs[0];
  }, [packs, selectedCredits]);

  const buyCredits = async (amount: number, price: number) => {
    try {
      setIsBuying(amount);

      const res = await fetch("/api/credits/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      await safeJson(res).catch(() => null);

      await refresh?.();
      alert(`Purchased ${amount} credits for ₹${price}!`);
    } catch (e: any) {
      alert(e?.message || "Failed to purchase credits.");
    } finally {
      setIsBuying(null);
    }
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/billing/history", { cache: "no-store" });
        const data = await safeJson(res);
        setBillingHistory(Array.isArray(data?.history) ? data.history : []);
      } catch {
        setBillingHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-white px-4 sm:px-6 py-8 sm:py-10 relative overflow-x-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
      <div className="absolute -top-24 left-1/2 h-[380px] w-[920px] -translate-x-1/2 rounded-full bg-indigo-500/15 blur-[120px]" />
      <div className="absolute -bottom-32 right-[-120px] h-[420px] w-[420px] rounded-full bg-purple-500/12 blur-[120px]" />

      <main className="relative z-10 max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => (window.location.href = "/")}
            className="text-sm text-white/60 hover:text-white transition flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
              Secure billing
            </span>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition inline-flex items-center gap-2"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mt-8 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/50">
            <Sparkles size={14} />
            Billing & Credits
          </div>

          <h1 className="mt-3 text-3xl sm:text-5xl font-semibold leading-[1.05]">
            Manage your credits
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/60 max-w-2xl">
            Buy more credits and view your payment history. Everything stays
            synced to your account.
          </p>
        </div>

        {/* Top grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Balance */}
          <section className="lg:col-span-1">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Current credits
                  </p>
                  <p className="text-4xl font-bold mt-2">{credits}</p>
                  <p className="text-xs text-white/50 mt-1">Available balance</p>
                </div>

                <div className="h-12 w-12 rounded-2xl bg-black/25 border border-white/10 flex items-center justify-center">
                  <CreditCard size={18} className="text-white/80" />
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-black/25 border border-white/10 p-4">
                <p className="text-xs text-white/60 leading-snug">
                  Tip: Credits are used for generation, downloads, and premium
                  features.
                </p>
              </div>
            </div>
          </section>

          {/* Buy credits */}
          <section className="lg:col-span-2">
            <div className="rounded-[26px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Purchase
                  </p>
                  <h2 className="text-xl font-semibold mt-1">Buy credits</h2>
                  <p className="text-sm text-white/55 mt-1">
                    Choose a pack to continue generating.
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                  Instant top-up
                </span>
              </div>

              {/* Packs (click card to select) */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {packs.map((pack) => {
                  const active = pack.c === selectedCredits;

                  return (
                    <div
                      key={pack.c}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedCredits(pack.c);
                        safeSetSelectedPack(pack);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCredits(pack.c);
                          safeSetSelectedPack(pack);
                        }
                      }}
                      className={[
                        "relative rounded-[26px] border bg-black/25 p-5 cursor-pointer transition",
                        "focus:outline-none focus:ring-2 focus:ring-purple-500/40",
                        active
                          ? "border-purple-400/60 ring-2 ring-purple-500/30"
                          : "border-white/10 hover:border-white/20",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={[
                            "text-[11px] px-2.5 py-1 rounded-full border",
                            active
                              ? "bg-emerald-500/15 border-emerald-400/25 text-emerald-200"
                              : "bg-white/5 border-white/10 text-white/70",
                          ].join(" ")}
                        >
                          {pack.badge || "Pack"}
                        </span>

                        {active && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-200">
                            <Check size={14} />
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="mt-5">
                        <p className="text-5xl font-bold leading-none">{pack.c}</p>
                        <p className="text-white/70 mt-2">Credits</p>

                        <p className="mt-6 text-2xl font-semibold">
                          ₹{formatINR(pack.p)}
                        </p>
                        <p className="text-sm text-white/55 mt-2">
                          {pack.desc || "Instant top-up"}
                        </p>
                      </div>

                      <div className="mt-6">
                        <AnimatedButton
                          onClick={(e: any) => {
                            // keep selection behavior, but prevent any odd focus/keyboard bubbling
                            e?.stopPropagation?.();
                            buyCredits(pack.c, pack.p);
                          }}
                          disabled={isBuying !== null}
                          className={[
                            "w-full py-3 rounded-2xl font-semibold text-sm transition border shadow",
                            active
                              ? "bg-white text-black border-transparent hover:bg-gray-200"
                              : "bg-white/5 text-white border-white/10 hover:bg-white/10",
                            isBuying === pack.c ? "opacity-70 cursor-wait" : "",
                          ].join(" ")}
                        >
                          {isBuying === pack.c
                            ? "Processing..."
                            : active
                            ? "Buy selected"
                            : "Buy"}
                        </AnimatedButton>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected summary */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60 leading-snug">
                <span className="text-white/85 font-semibold">Selected pack:</span>{" "}
                <span className="text-white/90 font-semibold">
                  {selectedPack.c} credits (₹{formatINR(selectedPack.p)})
                </span>
              </div>

              {/* Continue to Purchase */}
              <div className="mt-4">
                <AnimatedButton
                  onClick={() => buyCredits(selectedPack.c, selectedPack.p)}
                  disabled={isBuying !== null}
                  className={[
                    "w-full py-4 rounded-2xl font-semibold text-base transition shadow flex items-center justify-center gap-2",
                    isBuying !== null
                      ? "bg-white/60 text-black cursor-wait"
                      : "bg-white text-black hover:bg-gray-200",
                  ].join(" ")}
                >
                  {isBuying === selectedPack.c ? (
                    "Processing..."
                  ) : (
                    <>
                      Continue to Purchase <ArrowRight size={18} />
                    </>
                  )}
                </AnimatedButton>

                <p className="mt-2 text-center text-xs text-white/45">
                  Tip: Select a pack above, then continue to purchase.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* History */}
        <section className="mt-6">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-black/25 border border-white/10 flex items-center justify-center">
                  <History size={18} className="text-white/80" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    History
                  </p>
                  <h3 className="text-lg font-semibold mt-0.5">Billing history</h3>
                  <p className="text-xs text-white/55 mt-0.5">
                    Track past purchases and credit additions.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
                Last 30 entries
              </span>
            </div>

            <div className="mt-5">
              {loading ? (
                <p className="text-white/40 text-sm">Loading history...</p>
              ) : billingHistory.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-center">
                  <p className="text-white/80 font-semibold">No billing history yet</p>
                  <p className="text-xs text-white/50 mt-1">
                    Your purchases will appear here after you buy credits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {billingHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start sm:items-center justify-between gap-3 bg-black/25 p-4 rounded-2xl border border-white/10"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{item.credits} Credits</p>
                        <p className="text-xs text-white/45 mt-1">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold">₹{formatINR(item.amount)}</p>
                        <p className="text-[11px] text-white/45">Paid</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-xs text-white/45">
              <p>
                Need help?{" "}
                <span className="text-white/70 font-semibold">Contact support</span>{" "}
                if something looks off.
              </p>
              <p>Amounts shown in INR (₹)</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
