// app/refund/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthWall from "@/app/components/AuthWall";
import { ArrowRight, Receipt, CreditCard, Shield, ChevronUp } from "lucide-react";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400/80 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold leading-tight break-words">
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-3 text-[12px] sm:text-sm text-white/70 leading-relaxed break-words">
        {children}
      </div>
    </section>
  );
}

export default function RefundPolicyPage() {
  const [showTop, setShowTop] = useState(false);

  // ✅ Avoid hydration mismatch: do NOT use new Date() in render
  const lastUpdated = useMemo(() => "30 Dec 2025", []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toc = [
    { id: "intro", label: "Overview" },
    { id: "credits", label: "Credits & Digital Goods" },
    { id: "eligibility", label: "Refund Eligibility" },
    { id: "nonrefundable", label: "Non‑Refundable Cases" },
    { id: "chargebacks", label: "Chargebacks & Disputes" },
    { id: "howto", label: "How to Request" },
    { id: "timelines", label: "Review Timelines" },
    { id: "pricing", label: "Pricing Changes" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <AuthWall mode="soft">
      <div className="relative min-h-screen bg-[#07070B] text-white pb-24 overflow-hidden">
        {/* Ambient */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[980px] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[140px]" />
          <div className="absolute bottom-[-240px] right-[-140px] h-[560px] w-[560px] rounded-full bg-indigo-500/16 blur-[140px]" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/50" />
        </div>

        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          {/* Header */}
          <header className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/workspace"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/25 transition px-3 py-1.5 text-[11px] text-white/80"
                  >
                    Back to Workspace <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/terms"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition px-3 py-1.5 text-[11px] text-white/80"
                  >
                    Terms <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/privacy"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition px-3 py-1.5 text-[11px] text-white/80"
                  >
                    Privacy <ArrowRight size={14} />
                  </Link>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70">
                    <Shield size={14} />
                    Last updated: {lastUpdated}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <Receipt size={18} className="text-white/80" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-3xl font-semibold leading-tight break-words">
                      Refund Policy
                    </h1>
                    <p className="mt-1 text-[12px] sm:text-sm text-white/60 leading-snug break-words">
                      This policy explains refunds for credits and purchases on Gerox. It’s designed
                      to be clear and fair while protecting against abuse of digital goods.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-px bg-white/10" />
          </header>

          {/* Content */}
          <div className="mt-6 grid grid-cols-12 gap-6">
            {/* TOC */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="lg:sticky lg:top-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-4 sm:p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-3">
                    Contents
                  </p>
                  <div className="grid gap-2">
                    {toc.map((t) => (
                      <a
                        key={t.id}
                        href={`#${t.id}`}
                        className="rounded-2xl px-3 py-2 text-[12px] sm:text-sm bg-black/25 border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20 transition"
                      >
                        {t.label}
                      </a>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-[11px] text-white/55 leading-snug">
                    <span className="text-white/80 font-semibold">Quick note:</span> Credits are
                    digital goods. Once used to generate images, they’re typically non‑refundable.
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-white/55">
                    <CreditCard size={14} className="text-white/60" />
                    Purchases are processed by payment partners.
                  </div>
                </div>
              </div>
            </aside>

            {/* Sections */}
            <section className="col-span-12 lg:col-span-8 space-y-4 sm:space-y-5">
              <Section id="intro" title="1) Overview">
                <p>
                  Gerox offers paid credits to generate AI images and access premium features.
                  Because credits are digital goods, refunds depend on whether the credits were
                  used and whether there was an error on our side.
                </p>
              </Section>

              <Section id="credits" title="2) Credits & Digital Goods">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    Credits are consumed when you start an image generation or regeneration.
                  </li>
                  <li>
                    Delivered digital goods (e.g., generated images) are not “returnable” like
                    physical products.
                  </li>
                  <li>
                    Your remaining credit balance may be visible in the Workspace and Billing flows.
                  </li>
                </ul>
              </Section>

              <Section id="eligibility" title="3) Refund Eligibility">
                <p>We may approve a refund or credit restoration in cases such as:</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>
                    <span className="text-white/85 font-semibold">Duplicate charge:</span> you were
                    billed twice for the same purchase.
                  </li>
                  <li>
                    <span className="text-white/85 font-semibold">Service failure:</span> a verified
                    technical issue caused a charge or credit deduction without delivering the
                    expected result.
                  </li>
                  <li>
                    <span className="text-white/85 font-semibold">Unauthorized purchase:</span>{" "}
                    subject to verification and payment provider rules.
                  </li>
                </ul>
                <p className="mt-3 text-white/60">
                  If eligible, we may issue either a refund (to the original payment method) or
                  restore credits—whichever is most appropriate.
                </p>
              </Section>

              <Section id="nonrefundable" title="4) Non‑Refundable Cases">
                <p>Refunds are generally not provided when:</p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>Credits were already used to generate outputs.</li>
                  <li>You changed your mind after successful delivery.</li>
                  <li>Requests involve violating Terms (abuse, fraud, prohibited content).</li>
                  <li>Issues are caused by the user’s device/network/browser extensions.</li>
                </ul>
              </Section>

              <Section id="chargebacks" title="5) Chargebacks & Disputes">
                <p>
                  If you initiate a chargeback, your account may be temporarily restricted while
                  we investigate. To resolve issues fastest, please contact support first so we can
                  review and fix it without disputes.
                </p>
              </Section>

              <Section id="howto" title="6) How to Request a Refund">
                <p>
                  Email us with the details below. The more info you provide, the faster we can
                  help:
                </p>
                <ul className="list-disc pl-5 space-y-2 mt-3">
                  <li>Your account email/username</li>
                  <li>Transaction ID / payment reference</li>
                  <li>Date/time of purchase</li>
                  <li>What happened (and screenshots if possible)</li>
                </ul>
                <p className="mt-3">
                  Send requests to{" "}
                  <span className="text-white/85 font-semibold">support@gerox.ai</span>.
                </p>
              </Section>

              <Section id="timelines" title="7) Review Timelines">
                <p>
                  We typically respond within <span className="text-white/85 font-semibold">1–3 business days</span>.
                  If approved, the time for funds to appear depends on your payment method and
                  processor (often 5–10 business days).
                </p>
              </Section>

              <Section id="pricing" title="8) Pricing Changes">
                <p>
                  Credit pack pricing, availability, and promotions may change over time. Pricing
                  changes do not apply retroactively to completed purchases.
                </p>
              </Section>

              <Section id="contact" title="9) Contact">
                <p>
                  Questions? Contact{" "}
                  <span className="text-white/85 font-semibold">support@gerox.ai</span>.
                </p>
              </Section>

              {/* Footer CTA */}
              <div className="mt-2 rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-white/45">Last updated: {lastUpdated}</p>
                  <Link
                    href="/workspace"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                  >
                    Go to Workspace <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* Back to top */}
          {showTop && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-6 right-6 z-50 rounded-2xl p-3 bg-white/10 border border-white/15 hover:bg-white/15 transition shadow-[0_20px_80px_rgba(0,0,0,0.5)]"
              aria-label="Back to top"
            >
              <ChevronUp size={18} />
            </button>
          )}
        </main>
      </div>
    </AuthWall>
  );
}
