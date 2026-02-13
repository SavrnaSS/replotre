"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Sparkles, ShieldCheck, ArrowLeft } from "lucide-react";
import useAuth from "@/app/hooks/useAuth";
import {
  type BillingKey,
  type PlanKey,
  getPlanConfig,
  getPlanId,
} from "@/app/config/billingPlans";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const billingParam = searchParams.get("billing");
  const emailParam = (searchParams.get("email") || "").trim().toLowerCase();

  const plan: PlanKey =
    planParam === "basic" || planParam === "pro" || planParam === "elite"
      ? planParam
      : "pro";
  const billing: BillingKey =
    billingParam === "monthly" || billingParam === "yearly"
      ? billingParam
      : "monthly";

  // ✅ same email logic source as /profile
  const { user } = useAuth();
  const rawEmail = user?.email || "";
  const safeEmail =
    typeof rawEmail === "string" && rawEmail.trim().length > 0
      ? rawEmail.trim().toLowerCase()
      : "";

  const effectiveEmail = safeEmail || emailParam;
  const isSignedIn = !!safeEmail;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isSignedIn && effectiveEmail) {
      window.localStorage.setItem("gx_guest_email", effectiveEmail);
    }
  }, [effectiveEmail, isSignedIn]);

  const planId = getPlanId(billing, plan);
  const planMeta = getPlanConfig(billing, plan);
  const priceLabel = `$${planMeta.price}/mo`;
  const billingLabel = billing === "monthly" ? "billed monthly" : "billed annually";

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  const whopOrigin = process.env.NEXT_PUBLIC_WHOP_ORIGIN;
  const useCustomEmbed = Boolean(whopOrigin && whopOrigin !== "https://whop.com");

  const [iframeHeight, setIframeHeight] = useState(1120);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [hasExpanded, setHasExpanded] = useState(false);
  const [checkoutState, setCheckoutState] = useState<
    "idle" | "success" | "failed"
  >("idle");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [lastCredits, setLastCredits] = useState<number | null>(null);
  const [hasTrackedOutcome, setHasTrackedOutcome] = useState(false);

  // ✅ used to "best-effort" force the WhopCheckoutEmbed iframe height too
  const checkoutEmbedRef = useRef<HTMLDivElement | null>(null);

  const minIframeHeight = useMemo(() => {
    if (!viewportHeight) return 720;
    const offset = viewportHeight < 900 ? 240 : 300;
    const base = Math.max(640, viewportHeight - offset);
    const scaled = Math.round(base * 0.8);
    return hasExpanded ? scaled : Math.max(520, scaled - 80);
  }, [viewportHeight, hasExpanded]);

  const clampIframeHeight = useCallback(
    (value: number) => Math.max(minIframeHeight, value),
    [minIframeHeight]
  );

  const iframeUrl = useMemo(() => {
    if (!planId || !whopOrigin) return "";
    const url = new URL(`/embedded/checkout/${planId}/`, whopOrigin);
    if (baseUrl) url.searchParams.set("h", baseUrl);
    url.searchParams.set("v", "2");
    url.searchParams.set("theme", "dark");
    url.searchParams.set("theme.accentColor", "blue");
    url.searchParams.set("skip_redirect", "1");
    const redirectParams = new URLSearchParams({
      plan,
      billing,
    });
    if (effectiveEmail) {
      redirectParams.set("email", effectiveEmail);
    }
    url.searchParams.set(
      "payment_redirect_url",
      `${baseUrl}/checkout/complete?${redirectParams.toString()}`
    );

    if (effectiveEmail) {
      url.searchParams.set("email.hidden", "1");
      url.searchParams.set("email.disabled", "1");
      url.searchParams.set("email", effectiveEmail);
    }
    return url.toString();
  }, [planId, whopOrigin, baseUrl, plan, billing, effectiveEmail]);

  const handleCheckoutSuccess = useCallback((id?: string) => {
    setCheckoutState("success");
    if (id) setReceiptId(id);
  }, []);

  const statusParam = (searchParams.get("status") || "").toLowerCase();
  const isErrorStatus =
    statusParam === "failed" || statusParam === "error" || statusParam === "cancelled";

  useEffect(() => {
    if (isErrorStatus) setCheckoutState("failed");
  }, [isErrorStatus]);

  useEffect(() => {
    if (hasTrackedOutcome) return;
    if (checkoutState === "success") {
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "checkout.success",
          payload: { plan, billing },
        }),
      }).catch(() => {});
      setHasTrackedOutcome(true);
    }
    if (checkoutState === "failed") {
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "checkout.failed",
          payload: { plan, billing },
        }),
      }).catch(() => {});
      setHasTrackedOutcome(true);
    }
  }, [checkoutState, hasTrackedOutcome, plan, billing]);

  // ✅ Custom iframe: listen for Whop resize + complete messages
  useEffect(() => {
    if (!useCustomEmbed) return;

    const onMessage = (event: MessageEvent) => {
      if (whopOrigin && event.origin !== whopOrigin) return;
      const data = event?.data;
      if (!data || typeof data !== "object") return;
      if ((data as any).__scope !== "whop-embedded-checkout") return;

      if ((data as any).event === "resize" && typeof (data as any).height === "number") {
        const bufferedHeight = (data as any).height + 120;
        setIframeHeight((prev) => {
          const next = Math.max(prev, clampIframeHeight(bufferedHeight));
          if (next > prev + 40) setHasExpanded(true);
          return next;
        });
      }

      if ((data as any).event === "complete") {
        const receipt = (data as any).receipt_id || (data as any).setup_intent_id;
        handleCheckoutSuccess(receipt);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [useCustomEmbed, whopOrigin, clampIframeHeight, handleCheckoutSuccess]);

  // ✅ viewport height baseline
  useEffect(() => {
    const updateViewportHeight = () => setViewportHeight(window.innerHeight);
    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    return () => window.removeEventListener("resize", updateViewportHeight);
  }, []);

  // ✅ keep iframeHeight never below min
  useEffect(() => {
    if (!viewportHeight) return;
    setIframeHeight((prev) => clampIframeHeight(prev));
  }, [viewportHeight, clampIframeHeight]);

  useEffect(() => {
    if (checkoutState !== "success") return;
    let active = true;
    let polls = 0;

    const poll = async () => {
      try {
        const res = await fetch("/api/billing/last", { cache: "no-store" });
        const data = await res.json();
        const last = data?.last ?? null;
        if (last?.credits && active) setLastCredits(last.credits);
        if (last?.createdAt) {
          const createdAt = new Date(last.createdAt).getTime();
          if (Date.now() - createdAt < 5 * 60 * 1000) {
            if (active) {
              setConfirmed(true);
              setChecking(false);
            }
            return;
          }
        }
      } catch {
        // noop
      }

      polls += 1;
      if (polls >= 12 && active) {
        setChecking(false);
      }
    };

    setChecking(true);
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [checkoutState]);

  useEffect(() => {
    if (checkoutState !== "success") return;
    let active = true;
    const syncOnboarding = async () => {
      try {
        const emailQuery = !isSignedIn && effectiveEmail
          ? `?email=${encodeURIComponent(effectiveEmail)}`
          : "";
        const res = await fetch(`/api/onboarding/status${emailQuery}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const existing = data?.profile?.data ?? {};
        await fetch("/api/onboarding/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: existing,
            plan,
            billing,
            completed: true,
            email: !isSignedIn ? effectiveEmail : undefined,
          }),
        });
      } catch {
        // noop
      }
    };
    syncOnboarding();
    return () => {
      active = false;
    };
  }, [checkoutState, plan, billing, effectiveEmail, isSignedIn]);

  // ✅ Best-effort: force WhopCheckoutEmbed's internal iframe to follow our height/minHeight too
  useEffect(() => {
    if (useCustomEmbed) return; // only needed for WhopCheckoutEmbed path
    const root = checkoutEmbedRef.current;
    if (!root) return;

    const apply = () => {
      const iframe = root.querySelector("iframe") as HTMLIFrameElement | null;
      if (!iframe) return;
      iframe.style.width = "100%";
      iframe.style.border = "0";
      iframe.style.display = "block";
      iframe.style.background = "transparent";
      // keep it at least as tall as our surface
      iframe.style.minHeight = `${Math.max(minIframeHeight, iframeHeight)}px`;
      iframe.style.height = `${Math.max(minIframeHeight, iframeHeight)}px`;
    };

    apply();

    const mo = new MutationObserver(() => apply());
    mo.observe(root, { childList: true, subtree: true });

    const id = window.setInterval(apply, 600); // small safety net for late iframe swaps
    return () => {
      mo.disconnect();
      window.clearInterval(id);
    };
  }, [useCustomEmbed, minIframeHeight, iframeHeight]);

  // ✅ This is the key: make the *background surface* track the same height
  const checkoutSurfaceStyle = useMemo(
    () => ({
      minHeight: `${Math.max(minIframeHeight, iframeHeight)}px`,
    }),
    [minIframeHeight, iframeHeight]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070B] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-10">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            Complete your purchase
          </h1>
          <p className="mt-2 text-sm text-white/60">Secure checkout powered by Whop</p>
        </div>

        <div className="mt-10 grid grid-cols-12 items-start gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10">
          {/* Left info */}
          <aside className="order-1 col-span-12 lg:order-1 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-[28px] border border-blue-400/10 bg-[#0a0f1f]/70 backdrop-blur-xl shadow-[0_30px_130px_rgba(4,10,30,0.7)]">
              <div className="border-b border-white/10 px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                      Your plan
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">{planMeta.label} Plan</h2>
                    <p className="mt-1 text-sm text-white/65">
                      {priceLabel} • {billingLabel}
                    </p>
                  </div>

                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-[0_14px_50px_rgba(59,130,246,0.25)]">
                    <Sparkles size={18} />
                  </div>
                </div>

                {/* Tip with email */}
                <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
                  💡 Tip: Please use email{" "}
                  <span className="font-semibold text-white/95">
                    {isSignedIn ? safeEmail : "you use to sign in"}
                  </span>{" "}
                  at checkout.
                  <span className="block mt-1 text-xs text-white/60">
                    (This helps us auto-link your purchase to your account.)
                  </span>
                </div>

                {isSignedIn ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/70">
                      <ShieldCheck size={14} className="text-emerald-300" />
                      Signed in
                    </div>
                    <Link
                      href="/workspace"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/85 hover:bg-white/[0.08]"
                    >
                      <ArrowLeft size={16} />
                      Sign in to auto-fill email
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right checkout */}
          <section className="order-2 col-span-12 lg:order-2">
            <div className="relative overflow-hidden rounded-[28px] border border-blue-400/10 bg-[#0a0f1f]/70 backdrop-blur-xl shadow-[0_30px_130px_rgba(4,10,30,0.7)]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/10 to-transparent" />

              <div className="relative border-b border-white/10 px-6 py-6 hidden lg:block">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                  Checkout
                </p>
                <h2 className="mt-2 text-xl font-semibold">Payment details</h2>
                <p className="mt-1 text-sm text-white/60">
                  Complete your order to activate your plan.
                </p>
              </div>

              <div className="px-3 pb-4 pt-3 sm:px-5 sm:pb-6 sm:pt-5">
                {checkoutState === "failed" && (
                  <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    Payment didn’t complete. Please try again or use another
                    payment method.
                  </div>
                )}

                {checkoutState === "success" && (
                  <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    <div className="font-semibold">Payment received</div>
                    <div className="mt-1 text-xs text-emerald-100/90">
                      {confirmed
                        ? `Credits added: ${lastCredits ?? planMeta.credits}`
                        : checking
                        ? "Confirming payment and applying credits..."
                        : "Payment received. Credits will appear shortly."}
                      {receiptId ? ` • Receipt: ${receiptId}` : ""}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Link
                        href="/checkout"
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/85 transition hover:bg-white/10"
                      >
                        Manage plan
                      </Link>
                      <Link
                        href="/playground"
                        className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-white/90 transition hover:bg-emerald-500/30"
                      >
                        Go to workspace
                      </Link>
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-white/10 bg-black/30 p-2 sm:p-3">
                  {/* ✅ Surface that matches iframeHeight, so your background color length updates */}
                  <div
                    className="rounded-2xl bg-[#0b1220]"
                    style={{
                      ...checkoutSurfaceStyle,
                      opacity: checkoutState === "success" ? 0.55 : 1,
                      pointerEvents: checkoutState === "success" ? "none" : "auto",
                    }}
                  >
                    {planId ? (
                      useCustomEmbed ? (
                        <iframe
                          title="Whop Embedded Checkout"
                          src={iframeUrl}
                          style={{ height: `${Math.max(minIframeHeight, iframeHeight)}px` }}
                          className="w-full border-0 transition-[height] duration-300 ease-out"
                          onLoad={() => {
                            setIframeLoaded(true);
                            setIframeHeight((prev) =>
                              Math.max(prev, minIframeHeight + 160)
                            );
                          }}
                          allow="document-domain; execution-while-not-rendered; execution-while-out-of-viewport; payment; paymentRequest; sync-script;"
                          sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation allow-downloads"
                        />
                      ) : (
                        <div
                          ref={checkoutEmbedRef}
                          className="w-full"
                          style={checkoutSurfaceStyle}
                        >
                          <WhopCheckoutEmbed
                            key={`${planId}:${isSignedIn ? safeEmail : "guest"}`}
                            planId={planId}
                            theme="dark"
                            themeOptions={{ accentColor: "blue" }}
                            skipRedirect
                            onComplete={(id: string, receipt?: string) =>
                              handleCheckoutSuccess(receipt ?? id)
                            }
                            returnUrl={`${
                              process.env.NEXT_PUBLIC_BASE_URL ?? ""
                            }/checkout/complete?plan=${plan}&billing=${billing}`}
                            prefill={isSignedIn ? { email: safeEmail } : undefined}
                            hideEmail={isSignedIn}
                            disableEmail={isSignedIn}
                          />
                        </div>
                      )
                    ) : (
                      <div className="grid min-h-[420px] place-items-center px-6 py-10 text-center text-sm text-white/70">
                        <div>
                          <p className="text-base font-semibold text-white">
                            Checkout unavailable
                          </p>
                          <p className="mt-2 text-white/70">
                            This plan is not configured yet. Please try another
                            plan or contact support.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/60">
                  After payment, you’ll be redirected back with a{" "}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">
                    status
                  </code>{" "}
                  query param (success/error).
                </div>
              </div>
            </div>
            <div className="h-4" />
          </section>
        </div>
      </div>
    </main>
  );
}
