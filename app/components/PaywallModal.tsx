"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Shield, Sparkles, X } from "lucide-react";

type Pack = { c: number; p: number; badge?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional: preselect from caller */
  initialSelected?: number | null;
};

const LS_KEY = "gerox_selected_pack";

export default function PaywallModal({ open, onClose, initialSelected = null }: Props) {
  const router = useRouter();

  const packs = useMemo<Pack[]>(
    () => [
      { c: 3, p: 199, badge: "Starter" },
      { c: 10, p: 499, badge: "Most popular" },
      { c: 30, p: 999, badge: "Best value" },
    ],
    []
  );

  const [selected, setSelected] = useState<number | null>(initialSelected);

  // Restore selection if user previously picked a pack
  useEffect(() => {
    if (!open) return;

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.c === "number") setSelected(parsed.c);
      } else {
        setSelected(initialSelected ?? null);
      }
    } catch {
      setSelected(initialSelected ?? null);
    }
  }, [open, initialSelected]);

  // ✅ Fix: allow modal content to scroll on mobile + lock background scroll
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouch = (document.body.style as any).touchAction;

    document.body.style.overflow = "hidden";
    (document.body.style as any).touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).touchAction = prevTouch;
    };
  }, [open]);

  if (!open) return null;

  const chosen = packs.find((p) => p.c === selected) || null;

  const persistChoice = (c: number) => {
    const pack = packs.find((p) => p.c === c);
    if (!pack) return;
    setSelected(c);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ c: pack.c, p: pack.p }));
    } catch {}
  };

  const continueToBilling = () => {
    if (!chosen) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ c: chosen.c, p: chosen.p }));
    } catch {}
    // ✅ Send selection to billing so it shows without reselect
    router.push(`/billing?pack=${chosen.c}&price=${chosen.p}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <button
        aria-label="Close paywall"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* ✅ Scroll container (this is what fixes “can’t swipe up/down” on mobile) */}
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <div
          className={[
            "relative w-full sm:max-w-2xl",
            "rounded-t-[34px] sm:rounded-[34px]",
            "border border-white/10 bg-[#0B0B10]/95 backdrop-blur-xl",
            "shadow-[0_30px_120px_rgba(0,0,0,0.6)]",
            "max-h-[92vh] sm:max-h-[88vh]",
            "overflow-hidden",
          ].join(" ")}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 px-5 sm:px-7 pt-5 pb-4 border-b border-white/10 bg-[#0B0B10]/90 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/55">
                  <Sparkles size={14} />
                  Credits & Paywall
                </div>
                <h2 className="mt-2 text-xl sm:text-2xl font-semibold leading-tight">
                  Buy credits to continue
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Credits are used for image generation and re-generation.
                </p>
              </div>

              <button
                onClick={onClose}
                className="shrink-0 h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] transition flex items-center justify-center"
              >
                <X size={18} className="text-white/80" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-white/60">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10">
                <Shield size={14} />
                Secure billing
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10">
                <CreditCard size={14} />
                One-time top-up
              </span>
            </div>
          </div>

          {/* ✅ Scrollable content */}
          <div
            className={[
              "px-5 sm:px-7 py-5",
              "overflow-y-auto overscroll-contain",
              "[webkit-overflow-scrolling:touch]",
              "max-h-[calc(92vh-180px)] sm:max-h-[calc(88vh-180px)]",
            ].join(" ")}
          >
            {/* Packs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packs.map((p) => {
                const active = selected === p.c;

                return (
                  <button
                    key={p.c}
                    type="button"
                    onClick={() => persistChoice(p.c)}
                    className={[
                      "text-left rounded-[26px] border p-4 sm:p-5 transition",
                      "bg-white/[0.04] hover:bg-white/[0.06]",
                      active
                        ? "border-purple-400/60 ring-2 ring-purple-500/40"
                        : "border-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/70">
                        {p.badge}
                      </span>

                      {active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200">
                          <Check size={14} />
                          Selected
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/45">Tap to select</span>
                      )}
                    </div>

                    <div className="mt-4">
                      <p className="text-4xl font-semibold leading-none">{p.c}</p>
                      <p className="text-sm text-white/60 mt-1">Credits</p>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-white/50">Price</p>
                        <p className="text-xl font-semibold">${p.p}</p>
                      </div>

                      <div
                        className={[
                          "h-11 w-11 rounded-2xl border flex items-center justify-center",
                          active
                            ? "bg-white text-black border-transparent"
                            : "bg-white/[0.05] text-white border-white/10",
                        ].join(" ")}
                      >
                        <CreditCard size={18} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tip */}
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-white/65 leading-snug">
              <span className="text-white/85 font-semibold">Tip:</span> For the smoothest flow,
              purchase on the{" "}
              <span className="text-white font-semibold underline underline-offset-4">
                Billing
              </span>{" "}
              page where your history and balance update instantly.
            </div>

            <div className="h-4" />
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 px-5 sm:px-7 py-4 border-t border-white/10 bg-[#0B0B10]/90 backdrop-blur-xl">
            <button
              onClick={continueToBilling}
              disabled={!selected}
              className={[
                "w-full py-4 rounded-3xl font-semibold transition flex items-center justify-center gap-2",
                selected
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-white/10 text-white/50 border border-white/10 cursor-not-allowed",
              ].join(" ")}
            >
              Continue to Billing
            </button>

            {!selected && (
              <p className="mt-2 text-xs text-white/45 text-center">
                Select a pack to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
