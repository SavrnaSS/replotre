"use client";

import React, {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useAuth from "@/app/hooks/useAuth";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Sparkles,
  Store,
  Upload,
  Wand2,
  Globe,
  Instagram,
  Youtube,
  Film,
  Camera,
  BriefcaseBusiness,
  Dumbbell,
  Palette,
  Gamepad2,
  X,
  Lock,
  CreditCard,
  Crown,
} from "lucide-react";
import {
  type BillingKey,
  type PlanKey,
  BILLING_PLANS,
} from "@/app/config/billingPlans";
import { INFLUENCERS } from "@/app/data/influencers";

type GoalKey = "business" | "content" | "agency" | "tech";
type ExperienceKey = "new" | "some";
type CreateMethodKey = "market" | "custom";
type VisualStyleKey = "ultra" | "stylized" | "fantasy" | "anime";
type FrequencyKey = "daily" | "3x" | "weekly" | "occasionally";

type Influencer = {
  id: string;
  name: string;
  subtitle: string;
  src: string;
  badge?: string;
  claimed?: string;
};


function cn(...a: Array<string | false | undefined | null>) {
  return a.filter(Boolean).join(" ");
}

/**
 * GX Gradient (matches your screenshot CSS)
 * Uses the exact background + glossy overlay + border vibe.
 */
function GradientButton({
  children,
  className,
  innerClassName,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  innerClassName?: string;
}) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "gx-btn group select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-0",
        disabled ? "cursor-not-allowed opacity-50" : "hover:brightness-[1.06]",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold",
          innerClassName
        )}
      >
        {children}
      </span>
    </button>
  );
}

function GradientOutlineButton({
  children,
  className,
  innerClassName,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  innerClassName?: string;
}) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        "gx-btn gx-btn-outline group select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-0",
        disabled ? "cursor-not-allowed opacity-50" : "hover:brightness-[1.06]",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold",
          innerClassName
        )}
      >
        {children}
      </span>
    </button>
  );
}

const BackgroundFX = memo(function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-72 left-1/2 h-[540px] w-[860px] -translate-x-1/2 rounded-full bg-indigo-500/22 blur-[110px] sm:h-[720px] sm:w-[1100px] sm:bg-indigo-500/28 sm:blur-[140px]" />
      <div className="absolute -bottom-72 right-[-180px] h-[520px] w-[520px] rounded-full bg-sky-500/14 blur-[115px] sm:-bottom-80 sm:right-[-200px] sm:h-[720px] sm:w-[720px] sm:bg-sky-500/18 sm:blur-[150px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
    </div>
  );
});

const StepDots = memo(function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        return (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition",
              active ? "bg-white" : "bg-white/20"
            )}
          />
        );
      })}
    </div>
  );
});

function CardSelect({
  active,
  title,
  desc,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl border p-5 text-left transition",
        "bg-white/[0.04] hover:bg-white/[0.06]",
        active
          ? "border-indigo-300/60 shadow-[0_20px_80px_rgba(94,169,255,0.18)]"
          : "border-white/10"
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -left-24 top-0 h-48 w-48 rounded-full bg-indigo-500/18 blur-[50px]" />
        <div className="absolute -right-24 bottom-0 h-48 w-48 rounded-full bg-sky-500/14 blur-[60px]" />
      </div>

      <div className="relative flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl border",
            active
              ? "border-indigo-300/50 bg-indigo-500/15 text-indigo-200"
              : "border-white/10 bg-black/30 text-white/70"
          )}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white/90">
                {title}
              </p>
              <p className="mt-1 text-sm text-white/55">{desc}</p>
            </div>

            {badge ? (
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                {badge}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/55">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                active
                  ? "border-indigo-300/50 bg-indigo-500/15 text-indigo-200"
                  : "border-white/10 bg-white/5 text-white/50"
              )}
            >
              {active ? <Check size={13} /> : null}
            </span>
            <span>{active ? "Selected" : "Tap to select"}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function Page() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const TOTAL = 8;
  const [step, setStep] = useState(0);

  const [goal, setGoal] = useState<GoalKey>("business");
  const [experience, setExperience] = useState<ExperienceKey>("new");
  const [method, setMethod] = useState<CreateMethodKey>("market");
  const [influencerId, setInfluencerId] = useState<string>("inf-2");

  const [aiName, setAiName] = useState("Audrey");
  const [aiNameManuallyEdited, setAiNameManuallyEdited] = useState(false);

  const [niche, setNiche] = useState<
    | "fashion"
    | "fitness"
    | "travel"
    | "tech"
    | "food"
    | "art"
    | "finance"
    | "other"
  >("fitness");

  const [visualStyle, setVisualStyle] = useState<VisualStyleKey>("ultra");
  const [platforms, setPlatforms] = useState({
    instagram: true,
    youtube: false,
    tiktok: false,
  });
  const [frequency, setFrequency] = useState<FrequencyKey>("daily");
  const [contentTypes, setContentTypes] = useState({
    photos: true,
    videos: false,
  });

  const [billing, setBilling] = useState<BillingKey>("monthly");
  const [plan, setPlan] = useState<PlanKey>("pro");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [hasTrackedCheckout, setHasTrackedCheckout] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [onboardingAllowEdit, setOnboardingAllowEdit] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");

  const signedInEmail =
    typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  const isSignedIn = Boolean(signedInEmail);

  useEffect(() => {
    if (authLoading) return;
    if (!isSignedIn) {
      router.push("/login");
    }
  }, [authLoading, isSignedIn, router]);

  const guestEmailValid = useMemo(() => {
    if (!guestEmail) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail);
  }, [guestEmail]);

  useEffect(() => {
    if (isSignedIn) {
      setGuestEmail(signedInEmail);
      return;
    }
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("gx_guest_email") || "";
    if (stored) setGuestEmail(stored);
  }, [isSignedIn, signedInEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isSignedIn) {
      window.localStorage.removeItem("gx_guest_email");
      return;
    }
    if (guestEmail) {
      window.localStorage.setItem("gx_guest_email", guestEmail);
    }
  }, [guestEmail, isSignedIn]);

  const trackEvent = useCallback(async (name: string, payload?: any) => {
    try {
      await fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payload }),
      });
    } catch {
      // noop
    }
  }, []);

  const onboardingPayload = useMemo(
    () => ({
      goal,
      experience,
      method,
      influencerId,
      aiName,
      niche,
      visualStyle,
      platforms,
      frequency,
      contentTypes,
      billing,
      plan,
      step,
    }),
    [
      goal,
      experience,
      method,
      influencerId,
      aiName,
      niche,
      visualStyle,
      platforms,
      frequency,
      contentTypes,
      billing,
      plan,
      step,
    ]
  );

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const emailParam =
          !isSignedIn && guestEmailValid ? `?email=${encodeURIComponent(guestEmail)}` : "";
        const res = await fetch(`/api/onboarding/status${emailParam}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (active) {
          const completed = Boolean(data?.profile?.completedAt);
          const allowEdit = Boolean(data?.profile?.allowEdit);
          setOnboardingCompleted(completed);
          setOnboardingAllowEdit(allowEdit);
        }
      } catch {
        // noop
      } finally {
        if (active) setCheckingOnboarding(false);
      }
    };

    loadStatus();
    return () => {
      active = false;
    };
  }, [isSignedIn, guestEmail, guestEmailValid]);

  useEffect(() => {
    let active = true;
    const loadBilling = async () => {
      try {
        if (authLoading) return;
        if (!isSignedIn) {
          if (active) {
            setSubscriptionActive(false);
            setBillingLoaded(true);
          }
          return;
        }
        const res = await fetch(`/api/subscription/status`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (active) {
          setSubscriptionActive(Boolean(data?.active));
        }
      } catch {
        if (active) setSubscriptionActive(false);
      } finally {
        if (active) setBillingLoaded(true);
      }
    };
    loadBilling();
    return () => {
      active = false;
    };
  }, [authLoading, isSignedIn]);

  useEffect(() => {
    if (checkingOnboarding || !billingLoaded || authLoading) return;
    if ((onboardingCompleted && !onboardingAllowEdit) || subscriptionActive) return;
    if (!isSignedIn && !guestEmailValid) return;
    const id = window.setTimeout(async () => {
      try {
        await fetch("/api/onboarding/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: onboardingPayload,
            plan,
            billing,
            email: !isSignedIn ? guestEmail : undefined,
          }),
        });
        trackEvent("onboarding.autosave", {
          step,
          plan,
          billing,
          goal,
          niche,
          method,
        });
      } catch {
        // noop
      }
    }, 800);

    return () => {
      window.clearTimeout(id);
    };
  }, [
    onboardingPayload,
    plan,
    billing,
    checkingOnboarding,
    billingLoaded,
    authLoading,
    guestEmail,
    guestEmailValid,
    isSignedIn,
    onboardingCompleted,
    onboardingAllowEdit,
    subscriptionActive,
    trackEvent,
    step,
    goal,
    niche,
    method,
  ]);

  const getCheckoutUrl = useCallback(
    (billingKey: BillingKey, planKey: PlanKey) => {
      const params = new URLSearchParams({
        plan: planKey,
        billing: billingKey,
      });
      if (!isSignedIn && guestEmailValid) {
        params.set("email", guestEmail);
      }
      return `/checkout?${params.toString()}`;
    },
    [guestEmail, guestEmailValid, isSignedIn]
  );

  const influencers: Influencer[] = useMemo(() => {
    const meta: Record<string, Pick<Influencer, "badge" | "claimed">> = {
      "inf-1": { badge: "V2", claimed: "3/5 claimed" },
      "inf-2": { badge: "V2", claimed: "1/5 claimed" },
      "inf-3": { badge: "V2", claimed: "2/5 claimed" },
      "inf-4": { badge: "V2", claimed: "0/5 claimed" },
      "inf-5": { badge: "V2", claimed: "4/5 claimed" },
      "inf-6": { badge: "V2", claimed: "2/5 claimed" },
    };
    return INFLUENCERS.map((influencer) => ({
      ...influencer,
      ...meta[influencer.id],
    }));
  }, []);

  const selectedInfluencer =
    influencers.find((x) => x.id === influencerId) ?? influencers[0];

  useEffect(() => {
    if (!aiNameManuallyEdited && selectedInfluencer?.name) {
      setAiName(selectedInfluencer.name);
    }
  }, [selectedInfluencer, aiNameManuallyEdited]);

  const next = useCallback(() => {
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  }, []);
  const back = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  function Shell({
    title,
    subtitle,
    children,
    topPill,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    topPill?: string;
  }) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-10 sm:px-6 sm:pt-12">
        <div className="flex min-w-0 flex-col items-center">
          {!isSignedIn && (
            <div className="mb-6 w-full max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-white/[0.08] p-4 text-white/80 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-indigo-500/20">
                    <Sparkles size={16} className="text-indigo-100" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white/95">
                      Save your setup with email
                    </div>
                    <div className="mt-0.5 text-[12px] text-white/55">
                      Auto‑links after payment so your playground unlocks instantly.
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xs">
                  <input
                    value={guestEmail}
                    onChange={(e) =>
                      setGuestEmail(e.target.value.trim().toLowerCase())
                    }
                    placeholder="you@example.com"
                    inputMode="email"
                    className={`w-full rounded-2xl bg-black/45 px-4 py-2.5 text-xs text-white/90 outline-none ring-1 transition ${
                      guestEmail.length === 0
                        ? "ring-white/10 focus:ring-indigo-300/40"
                        : guestEmailValid
                        ? "ring-emerald-400/30 focus:ring-emerald-400/40"
                        : "ring-red-400/30 focus:ring-red-400/40"
                    }`}
                  />
                  <div className="mt-1 text-[11px] text-white/45">
                    Secure • used only to link your setup
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex min-w-0 flex-col items-center gap-3">
            <StepDots total={TOTAL} current={step} />
            <p className="text-[12px] text-white/50">
              Step {step + 1} of {TOTAL}
            </p>

            {topPill ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[12px] text-white/80">
                {topPill}
              </span>
            ) : null}

            <h1 className="mt-2 text-center text-[clamp(30px,5.2vw,64px)] font-semibold leading-[1.02] text-white">
              {title}
            </h1>

            {subtitle ? (
              <p className="max-w-2xl text-center text-sm text-white/60 sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="mt-10 w-full min-w-0">{children}</div>
        </div>
      </div>
    );
  }

  function FooterNav() {
    const isLast = step === TOTAL - 1;

    return (
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/35 backdrop-blur-[40px]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {step === 0 ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/35"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <GradientOutlineButton onClick={back} className="min-w-[112px]">
              <ArrowLeft size={16} />
              Back
            </GradientOutlineButton>
          )}

          <div className="hidden items-center gap-2 text-[12px] text-white/60 sm:flex">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Step {step + 1} of {TOTAL}
            </span>
            <span className="text-white/35">•</span>
            <span className="rounded-full border border-indigo-300/25 bg-indigo-500/10 px-3 py-1 text-indigo-200">
              Fast setup
            </span>
          </div>

          <GradientButton
            type="button"
            onClick={() => {
              if (isLast) setCheckoutOpen(true);
              else next();
              if (isLast && !hasTrackedCheckout) {
                trackEvent("checkout.modal_opened", { plan, billing });
                setHasTrackedCheckout(true);
              } else if (!isLast) {
                trackEvent("onboarding.step_completed", { step });
              }
            }}
            className="min-w-[175px]"
            innerClassName="px-6 py-2.5"
          >
            {isLast
              ? "Complete Purchase"
              : step === TOTAL - 2
              ? "Choose Plan"
              : "Continue"}
            <ArrowRight size={16} />
          </GradientButton>
        </div>
      </div>
    );
  }

  const planMeta = useMemo(() => BILLING_PLANS[billing], [billing]);

  const chosen = planMeta[plan];

  const onSetBilling = useCallback(
    (k: BillingKey) => {
      startTransition(() => setBilling(k));
      trackEvent("onboarding.billing_changed", { billing: k });
    },
    [trackEvent]
  );
  const onSetPlan = useCallback(
    (k: PlanKey) => {
      startTransition(() => setPlan(k));
      trackEvent("onboarding.plan_changed", { plan: k });
    },
    [trackEvent]
  );

  const handlePlanCTA = useCallback(
    (k: PlanKey) => {
      if (plan !== k) {
        onSetPlan(k);
        return;
      }
      setCheckoutOpen(true);
      if (!hasTrackedCheckout) {
        trackEvent("checkout.modal_opened", { plan: k, billing });
        setHasTrackedCheckout(true);
      }
    },
    [billing, hasTrackedCheckout, onSetPlan, plan, trackEvent]
  );

  useEffect(() => {
    trackEvent("onboarding.step_viewed", { step });
  }, [step, trackEvent]);

  if (checkingOnboarding || !billingLoaded || authLoading || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05030a] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/70">
          Redirecting to login...
        </div>
      </div>
    );
  }

  if ((onboardingCompleted && !onboardingAllowEdit) || subscriptionActive) {
    if (typeof window !== "undefined") {
      window.location.href = "/playground";
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05030a] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/70">
          Redirecting to your playground...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#05030a] text-white">
      <BackgroundFX />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between px-4 pt-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 text-[12px] text-white/55">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-300" />
            Final Setup
          </span>
          <ChevronRight size={14} className="text-white/30" />
          <span className="truncate text-indigo-200">
            {step === TOTAL - 1 ? "Choose Plan" : "Build your AI"}
          </span>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
            Secure • Private
          </span>
          <span className="rounded-full border border-indigo-300/20 bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-200">
            Optimized onboarding
          </span>
        </div>
      </div>

      <div className="relative z-10">
        {step === 0 && (
          <Shell
            topPill="✨ 5-minute setup"
            title="Create Your AI Creator Model"
            subtitle="Join thousands of creators building unique AI models — we’ll guide you through every step."
          >
         <div className="mx-auto max-w-4xl">
  <div className="flex gap-4 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible justify-center">
    {[
      { k: "5 min", v: "Setup time" },
      { k: "70+", v: "Ready models" },
      { k: "5K+", v: "Active creators" },
    ].map((x) => (
      <div
        key={x.v}
        className="mt-[40px] min-w-[240px] shrink-0 rounded-3xl text-center sm:mt-0 sm:min-w-0 sm:shrink"
      >
        <p className="text-[27px] font-semibold sm:text-3xl">{x.k}</p>
        <p className="mt-2 text-[13px] text-white/55 sm:text-sm">{x.v}</p>
      </div>
    ))}
  </div>

  <div className="mt-8 flex justify-center">
    <GradientButton type="button" onClick={next} innerClassName="px-8 py-3">
      Start Creating <ArrowRight className="ml-2 inline" size={16} />
    </GradientButton>
  </div>
</div>



          </Shell>
        )}

        {step === 1 && (
          <Shell
            title="What’s your goal?"
            subtitle="Choose your path — we’ll tailor the setup for your workflow."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <CardSelect
                active={goal === "business"}
                title="Build a Business"
                desc="Create and monetize AI creator models."
                icon={<BriefcaseBusiness size={20} />}
                onClick={() => setGoal("business")}
              />
              <CardSelect
                active={goal === "content"}
                title="Content Creation"
                desc="Generate content for social media."
                icon={<Palette size={20} />}
                onClick={() => setGoal("content")}
              />
              <CardSelect
                active={goal === "agency"}
                title="Agency Services"
                desc="Build AI models for clients."
                icon={<Store size={20} />}
                onClick={() => setGoal("agency")}
              />
              <CardSelect
                active={goal === "tech"}
                title="Explore Technology"
                desc="Learn cutting-edge AI capabilities."
                icon={<Gamepad2 size={20} />}
                onClick={() => setGoal("tech")}
              />
            </div>

            <div className="mt-10">
              <p className="text-sm font-semibold text-white/80">
                Your experience level
              </p>
              <div className="mt-3 grid gap-3">
                <button
                  type="button"
                  onClick={() => setExperience("new")}
                  className={cn(
                    "rounded-3xl border p-5 text-left transition",
                    experience === "new"
                      ? "border-indigo-300/60 bg-indigo-500/10 shadow-[0_18px_70px_rgba(94,169,255,0.14)]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border",
                        experience === "new"
                          ? "border-indigo-300/50 bg-indigo-500/15 text-indigo-200"
                          : "border-white/10 bg-white/5 text-white/40"
                      )}
                    >
                      {experience === "new" ? <Check size={14} /> : null}
                    </span>
                    <div>
                      <p className="font-semibold">I’m new to AI content</p>
                      <p className="mt-0.5 text-sm text-white/55">
                        We’ll recommend the simplest flow.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExperience("some")}
                  className={cn(
                    "rounded-3xl border p-5 text-left transition",
                    experience === "some"
                      ? "border-indigo-300/60 bg-indigo-500/10 shadow-[0_18px_70px_rgba(94,169,255,0.14)]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full border",
                        experience === "some"
                          ? "border-indigo-300/50 bg-indigo-500/15 text-indigo-200"
                          : "border-white/10 bg-white/5 text-white/40"
                      )}
                    >
                      {experience === "some" ? <Check size={14} /> : null}
                    </span>
                    <div>
                      <p className="font-semibold">
                        I’ve created AI content before
                      </p>
                      <p className="mt-0.5 text-sm text-white/55">
                        Show me more controls.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </Shell>
        )}

        {step === 2 && (
          <Shell
            title="Choose creation method"
            subtitle="Pick the fastest route — you can switch later anytime."
          >
            <div className="grid gap-4">
              <CardSelect
                active={method === "market"}
                title="Pick from Marketplace"
                desc="Choose from professionally tuned models (instant results)."
                icon={<Store size={20} />}
                badge="RECOMMENDED"
                onClick={() => setMethod("market")}
              />
              <CardSelect
                active={method === "custom"}
                title="Create a Custom Model"
                desc="Upload your own images and build a unique creator model."
                icon={<Upload size={20} />}
                onClick={() => setMethod("custom")}
              />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
              <span className="font-semibold text-white/80">Pro tip:</span>{" "}
              Start with marketplace to validate your niche, then upgrade to
              custom for maximum uniqueness.
            </div>
          </Shell>
        )}

        {step === 3 && (
          <Shell
            title="Pick your AI creator model"
            subtitle="Select a high-performing base model — no training required for this path."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {influencers.map((inf) => {
                const active = inf.id === influencerId;

                return (
                  <button
                    key={inf.id}
                    type="button"
                    onClick={() => setInfluencerId(inf.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-3xl border text-left",
                      "bg-white/[0.03] transition-all duration-300",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/60 focus-visible:ring-offset-0",
                      "hover:-translate-y-1 hover:shadow-[0_34px_140px_rgba(0,0,0,0.6)]",
                      active
                        ? "border-indigo-300/70 shadow-[0_32px_150px_rgba(94,169,255,0.18)]"
                        : "border-white/10 hover:border-white/25"
                    )}
                  >
                    {/* ✅ Selected tick badge (FIX) */}
                    <div
                      className={cn(
                        "absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition",
                        active
                          ? "border-white/20 bg-black/45 text-emerald-300 shadow-[0_12px_45px_rgba(0,0,0,0.45)]"
                          : "border-white/12 bg-black/25 text-white/35 opacity-0 group-hover:opacity-100"
                      )}
                      aria-hidden="true"
                    >
                      {active ? <Check size={18} /> : <Check size={18} />}
                    </div>

                    <div className="relative">
                      <div className="relative aspect-[4/5] w-full">
                        <Image
                          src={inf.src}
                          alt={inf.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className={cn(
                            "object-cover transition-transform duration-700 will-change-transform",
                            active ? "scale-[1.02]" : "group-hover:scale-[1.06]"
                          )}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div
                            className={cn(
                              "rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all duration-300",
                              active
                                ? "border-indigo-300/30 bg-black/50 shadow-[0_18px_70px_rgba(94,169,255,0.14)]"
                                : "border-white/10 bg-black/35 group-hover:border-white/20 group-hover:bg-black/45"
                            )}
                          >
                            <p className="text-sm font-semibold text-white/95">
                              {inf.name}
                            </p>
                            <p className="mt-1 text-[12px] text-white/60">
                              {inf.subtitle}
                            </p>

                            <div className="mt-3 flex items-center justify-between text-[11px] text-white/55">
                              <span className="inline-flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                                  <BadgeCheck size={13} />
                                </span>
                                Tuned preset
                              </span>

                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/60">
                                {inf.claimed}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Shell>
        )}

        {step === 4 && (
          <Shell
            title="Create your AI persona"
            subtitle="Give your creator model a unique identity so the content stays consistent."
          >
            <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <div className="grid gap-6">
                <div>
                  <p className="text-sm font-semibold text-white/80">AI Name</p>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <input
                      value={aiName}
                      onChange={(e) => {
                        setAiNameManuallyEdited(true);
                        setAiName(e.target.value);
                      }}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                      placeholder="e.g. Audrey"
                    />
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-500/10 text-indigo-200">
                      <Sparkles size={18} />
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white/80">
                    Choose a niche
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    {[
                      {
                        k: "fashion",
                        label: "Fashion & Beauty",
                        icon: <Palette size={18} />,
                      },
                      {
                        k: "fitness",
                        label: "Fitness & Health",
                        icon: <Dumbbell size={18} />,
                      },
                      {
                        k: "travel",
                        label: "Travel & Lifestyle",
                        icon: <Globe size={18} />,
                      },
                      {
                        k: "tech",
                        label: "Gaming & Tech",
                        icon: <Gamepad2 size={18} />,
                      },
                      {
                        k: "food",
                        label: "Food & Cooking",
                        icon: <Sparkles size={18} />,
                      },
                      {
                        k: "art",
                        label: "Art & Creativity",
                        icon: <Palette size={18} />,
                      },
                      {
                        k: "finance",
                        label: "Business & Finance",
                        icon: <BriefcaseBusiness size={18} />,
                      },
                      {
                        k: "other",
                        label: "Something Else",
                        icon: <Wand2 size={18} />,
                      },
                    ].map((x) => {
                      const active = niche === (x.k as any);
                      return (
                        <button
                          key={x.k}
                          type="button"
                          onClick={() => setNiche(x.k as any)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 text-center transition",
                            active
                              ? "border-indigo-300/60 bg-indigo-500/10 text-white shadow-[0_18px_70px_rgba(94,169,255,0.12)]"
                              : "border-white/10 bg-black/30 text-white/75 hover:bg-white/[0.05]"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl border",
                              active
                                ? "border-indigo-300/40 bg-indigo-500/15 text-indigo-200"
                                : "border-white/10 bg-white/5 text-white/60"
                            )}
                          >
                            {x.icon}
                          </span>
                          <span className="text-[12px] font-semibold">
                            {x.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white/80">
                    Visual style
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        k: "ultra",
                        t: "Ultra Realistic",
                        d: "Photoreal creator look",
                      },
                      {
                        k: "stylized",
                        t: "Stylized",
                        d: "Creative art direction",
                      },
                      { k: "fantasy", t: "Fantasy", d: "Cinematic worlds" },
                      {
                        k: "anime",
                        t: "Anime-inspired",
                        d: "Clean illustrated vibe",
                      },
                    ].map((x) => {
                      const active = visualStyle === (x.k as any);
                      return (
                        <button
                          key={x.k}
                          type="button"
                          onClick={() => setVisualStyle(x.k as any)}
                          className={cn(
                            "rounded-3xl border bg-black/30 p-5 text-left transition",
                            active
                              ? "border-indigo-300/60 bg-indigo-500/10 shadow-[0_18px_80px_rgba(94,169,255,0.14)]"
                              : "border-white/10 hover:bg-white/[0.05]"
                          )}
                        >
                          <p className="font-semibold">{x.t}</p>
                          <p className="mt-1 text-sm text-white/55">{x.d}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Shell>
        )}

        {step === 5 && (
          <Shell
            title="Choose your strategy"
            subtitle="Tell us how you want to grow — we’ll optimize recommendations."
          >
            <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
              <div className="grid gap-7">
                <div>
                  <p className="text-sm font-semibold text-white/80">
                    Select platforms
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        k: "instagram",
                        label: "Instagram",
                        icon: <Instagram size={20} />,
                      },
                      {
                        k: "youtube",
                        label: "YouTube",
                        icon: <Youtube size={20} />,
                      },
                      { k: "tiktok", label: "TikTok", icon: <Film size={20} /> },
                    ].map((x) => {
                      const active = (platforms as any)[x.k];
                      return (
                        <button
                          key={x.k}
                          type="button"
                          onClick={() =>
                            setPlatforms((p) => ({ ...p, [x.k]: !active }))
                          }
                          className={cn(
                            "flex items-center justify-between rounded-3xl border px-5 py-4 transition",
                            active
                              ? "border-indigo-300/60 bg-indigo-500/10 shadow-[0_16px_70px_rgba(94,169,255,0.12)]"
                              : "border-white/10 bg-black/30 hover:bg-white/[0.05]"
                          )}
                        >
                          <span className="inline-flex items-center gap-3">
                            <span
                              className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-2xl border",
                                active
                                  ? "border-indigo-300/40 bg-indigo-500/15 text-indigo-200"
                                  : "border-white/10 bg-white/5 text-white/60"
                              )}
                            >
                              {x.icon}
                            </span>
                            <span className="font-semibold">{x.label}</span>
                          </span>

                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full border",
                              active
                                ? "border-indigo-300/50 bg-indigo-500/15 text-indigo-200"
                                : "border-white/10 bg-white/5 text-white/35"
                            )}
                          >
                            {active ? <Check size={14} /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white/80">
                    Posting frequency
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      { k: "daily", t: "Daily", d: "Best for fastest growth" },
                      { k: "3x", t: "3–4x per week", d: "Balanced schedule" },
                      { k: "weekly", t: "Weekly", d: "Low effort" },
                      {
                        k: "occasionally",
                        t: "Occasionally",
                        d: "Just testing",
                      },
                    ].map((x) => {
                      const active = frequency === (x.k as any);
                      return (
                        <button
                          key={x.k}
                          type="button"
                          onClick={() => setFrequency(x.k as any)}
                          className={cn(
                            "rounded-3xl border bg-black/30 p-5 text-left transition",
                            active
                              ? "border-indigo-300/60 bg-indigo-500/10 shadow-[0_16px_70px_rgba(94,169,255,0.12)]"
                              : "border-white/10 hover:bg-white/[0.05]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{x.t}</p>
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full border",
                                active
                                  ? "border-indigo-300/50 bg-indigo-500/15 text-indigo-200"
                                  : "border-white/10 bg-white/5 text-white/35"
                              )}
                            >
                              {active ? <Check size={14} /> : null}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-white/55">{x.d}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white/80">
                    Content types
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      { k: "photos", t: "Photos", icon: <Camera size={20} /> },
                      { k: "videos", t: "Videos", icon: <Film size={20} /> },
                    ].map((x) => {
                      const active = (contentTypes as any)[x.k];
                      return (
                        <button
                          key={x.k}
                          type="button"
                          onClick={() =>
                            setContentTypes((p) => ({ ...p, [x.k]: !active }))
                          }
                          className={cn(
                            "flex items-center justify-between rounded-3xl border px-5 py-4 transition",
                            active
                              ? "border-indigo-300/60 bg-indigo-500/10 shadow-[0_16px_70px_rgba(94,169,255,0.12)]"
                              : "border-white/10 bg-black/30 hover:bg-white/[0.05]"
                          )}
                        >
                          <span className="inline-flex items-center gap-3">
                            <span
                              className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-2xl border",
                                active
                                  ? "border-indigo-300/40 bg-indigo-500/15 text-indigo-200"
                                  : "border-white/10 bg-white/5 text-white/60"
                              )}
                            >
                              {x.icon}
                            </span>
                            <span className="font-semibold">{x.t}</span>
                          </span>

                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full border",
                              active
                                ? "border-indigo-300/50 bg-indigo-500/15 text-indigo-200"
                                : "border-white/10 bg-white/5 text-white/35"
                            )}
                          >
                            {active ? <Check size={14} /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Shell>
        )}

        {step === 6 && (
          <Shell
            title={`${aiName || "Your AI"} is ready to launch!`}
            subtitle="Review your setup and start generating content instantly."
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_26px_120px_rgba(0,0,0,0.5)]">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={selectedInfluencer?.src || "/model/face-2-v2.jpg"}
                    alt={selectedInfluencer?.name || "AI creator model"}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute left-4 top-4 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold text-black">
                    ✓ ACTIVE
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-sm font-semibold text-white/90">
                      {selectedInfluencer?.name}
                    </p>
                    <p className="text-[12px] text-white/55">
                      {selectedInfluencer?.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_26px_120px_rgba(0,0,0,0.5)]">
                <div className="space-y-5">
                  {[
                    {
                      t: aiName || "AI Persona",
                      d: `${niche.toUpperCase()} • ${visualStyle.toUpperCase()}`,
                    },
                    {
                      t: "Influencer Ready",
                      d: `Based on ${selectedInfluencer?.name}`,
                    },
                    {
                      t: "Content Strategy Set",
                      d: frequency === "3x" ? "3–4x per week" : frequency,
                    },
                    {
                      t: "Ready to publish",
                      d: `Platforms: ${
                        Object.entries(platforms)
                          .filter(([, v]) => v)
                          .map(([k]) => k)
                          .join(", ") || "none"
                      }`,
                    },
                  ].map((x) => (
                    <div key={x.t} className="flex items-start gap-3">
                      <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                        <Check size={16} />
                      </span>
                      <div>
                        <p className="font-semibold text-white/90">{x.t}</p>
                        <p className="mt-1 text-sm text-white/55">{x.d}</p>
                      </div>
                    </div>
                  ))}

                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
                    <span className="font-semibold text-white/80">Next:</span>{" "}
                    Choose a plan to activate your AI + unlock generation &
                    scheduling.
                  </div>
                </div>
              </div>
            </div>
          </Shell>
        )}

        {step === 7 && (
          <Shell
            title="Final Step → Choose Plan"
            subtitle="Activate your AI with credits, scheduling, and premium generation."
          >
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_26px_120px_rgba(0,0,0,0.5)]">
                <div className="relative aspect-[4/3] w-full lg:aspect-auto">
                  <Image
                    src={selectedInfluencer?.src || "/model/face-2-v2.jpg"}
                    alt={selectedInfluencer?.name || "AI creator model"}
                    fill
                    className="object-cover lg:hidden"
                    priority
                  />
                  <Image
                    src={selectedInfluencer?.src || "/model/face-2-v2.jpg"}
                    alt={selectedInfluencer?.name || "AI creator model"}
                    width={1200}
                    height={1600}
                    className="hidden h-auto w-full object-cover lg:block"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold text-black">
                    <Check size={14} /> ACTIVE
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-lg font-semibold text-white/95">
                      {aiName || selectedInfluencer?.name}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      {selectedInfluencer?.subtitle} • {niche.toUpperCase()} •{" "}
                      {visualStyle.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-end">
                  <div className="inline-flex rounded-full border border-white/10 bg-black/30 p-1">
                    {(["monthly", "yearly"] as BillingKey[]).map((k) => {
                      const active = billing === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => onSetBilling(k)}
                          className={cn(
                            "rounded-full px-4 py-2 text-sm font-semibold transition",
                            active
                              ? "gx-chip-active"
                              : "text-white/60 hover:text-white"
                          )}
                        >
                          {k === "monthly" ? "Monthly" : "Yearly"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSetPlan("pro")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSetPlan("pro");
                    }
                  }}
                  className={cn(
                    "mt-4 w-full overflow-hidden rounded-3xl border text-left transition",
                    plan === "pro"
                      ? "border-indigo-300/80 shadow-[0_26px_120px_rgba(94,169,255,0.18)]"
                      : "border-white/10 hover:border-white/25",
                    "bg-white/[0.04] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                  )}
                >
                  <div className="relative p-5">
                    <div className="pointer-events-none absolute inset-0 opacity-40">
                      <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/16 blur-[70px]" />
                      <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-sky-500/12 blur-[80px]" />
                    </div>

                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold">Pro Plan</p>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                            MOST POPULAR
                          </span>
                        </div>

                        <div className="mt-2 flex items-end gap-2">
                          <p className="text-4xl font-semibold">
                            ${planMeta.pro.price}
                          </p>
                          <p className="pb-1 text-sm text-white/55">
                            /{billing === "monthly" ? "month" : "year"}
                          </p>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-white/70">
                          <div className="flex items-center gap-2">
                            <Check className="text-emerald-300" size={16} />
                            {planMeta.pro.credits} Credits (photos & videos)
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="text-emerald-300" size={16} />2
                            Model Tokens/month{" "}
                            <span className="text-white/40">
                              (claim or make 2 models)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        60 scheduled posts / 30 days
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="text-emerald-300" size={16} />
                            NSFW scheduled posts
                          </div>
                        </div>
                      </div>

                      <div className="mt-1 flex shrink-0 items-center gap-2">
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border transition",
                            plan === "pro"
                              ? "border-white/15 text-white shadow-[0_10px_40px_rgba(109,93,252,0.28)] gx-icon-badge"
                              : "border-white/10 bg-black/30 text-white/70"
                          )}
                        >
                          <Crown size={18} />
                        </span>
                      </div>
                    </div>

                    <div className="relative mt-5">
                      <button
                        type="button"
                        onClick={() => handlePlanCTA("pro")}
                        className={cn(
                          "gx-cta-bar w-full",
                          plan !== "pro" && "gx-cta-muted"
                        )}
                      >
                        {plan === "pro" ? "Get Started" : "Select"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSetPlan("basic")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSetPlan("basic");
                      }
                    }}
                    className={cn(
                      "rounded-3xl border bg-white/[0.04] p-5 text-left transition",
                      plan === "basic"
                        ? "border-indigo-300/70 shadow-[0_18px_80px_rgba(94,169,255,0.14)]"
                        : "border-white/10 hover:border-white/25",
                      "cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                    )}
                  >
                    <p className="text-base font-semibold">Basic Plan</p>
                    <p className="mt-2 text-2xl font-semibold">
                      ${planMeta.basic.price}{" "}
                      <span className="text-sm text-white/55">
                        /{billing === "monthly" ? "mo" : "yr"}
                      </span>
                    </p>
                    <div className="mt-4 space-y-2 text-sm text-white/70">
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        {planMeta.basic.credits} Credits (images only)
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        1 Model Token/month{" "}
                        <span className="text-white/40">(claim or make 1 model)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        15 scheduled posts / 30 days
                      </div>
                      <div className="flex items-center gap-2 text-rose-300/80">
                        <span className="text-rose-300/80">•</span> No video
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlanCTA("basic")}
                      className={cn(
                        "mt-4 gx-cta-bar w-full",
                        plan !== "basic" && "gx-cta-muted"
                      )}
                    >
                      {plan === "basic" ? "Get Started" : "Select"}
                    </button>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSetPlan("elite")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSetPlan("elite");
                      }
                    }}
                    className={cn(
                      "rounded-3xl border bg-white/[0.04] p-5 text-left transition",
                      plan === "elite"
                        ? "border-indigo-300/70 shadow-[0_18px_80px_rgba(94,169,255,0.14)]"
                        : "border-white/10 hover:border-white/25",
                      "cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                    )}
                  >
                    <p className="text-base font-semibold">Elite Plan</p>
                    <p className="mt-2 text-2xl font-semibold">
                      ${planMeta.elite.price}{" "}
                      <span className="text-sm text-white/55">
                        /{billing === "monthly" ? "mo" : "yr"}
                      </span>
                    </p>
                    <div className="mt-4 space-y-2 text-sm text-white/70">
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        {planMeta.elite.credits} Credits (photos & videos)
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        6 Model Tokens/month{" "}
                        <span className="text-white/40">(multi-brand setup)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        180 scheduled posts / 30 days
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={16} />
                        NSFW scheduled posts
                      </div>
                      <div className="flex items-center gap-2 text-indigo-200/80">
                        <span className="text-indigo-200/80">•</span> Premium support + priority renders
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlanCTA("elite")}
                      className={cn(
                        "mt-4 gx-cta-bar w-full",
                        plan !== "elite" && "gx-cta-muted"
                      )}
                    >
                      {plan === "elite" ? "Get Started" : "Select"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-5 text-center text-sm text-white/60">
                  <p className="text-[11px] tracking-wide text-white/45">
                    SECURE PAYMENT
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-6 text-white/70">
                    <span className="inline-flex items-center gap-2">
                      <CreditCard size={16} /> Card
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Lock size={16} /> Private & secure
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-white/45">
                    Instant access • Cancel anytime • No hidden fees
                  </p>
                </div>

                <div className="mt-3 text-center text-[11px] text-white/35">
                  All plans include PPV content generation.
                </div>
              </div>
            </div>
          </Shell>
        )}
      </div>

      {checkoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setCheckoutOpen(false)}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-[34px] border border-white/10 bg-[#07040f]/90 shadow-[0_40px_180px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-60">
              <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-500/18 blur-[110px]" />
              <div className="absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full bg-sky-500/12 blur-[120px]" />
            </div>

            <div className="relative px-6 pb-6 pt-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-center text-lg font-semibold text-white/95 sm:text-left">
                    Complete Your Purchase
                  </p>
                  <p className="mt-1 text-center text-[12px] text-white/55 sm:text-left">
                    {planMeta[plan].label} Plan •{" "}
                    {billing === "monthly" ? "Monthly" : "Annual"} subscription
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white/90">
                      {planMeta[plan].label} Plan
                    </p>
                    <p className="mt-1 text-[12px] text-white/55">
                      {billing === "monthly"
                        ? "Monthly billing"
                        : "Annual billing"}
                    </p>

                    <div className="mt-4 space-y-2 text-[13px] text-white/70">
                      <div className="flex items-center gap-2">
                        <Check className="text-indigo-200" size={16} /> Credits
                        + scheduling included
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-indigo-200" size={16} /> Fast
                        generation queue
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-indigo-200" size={16} /> Private &
                        secure checkout
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-semibold">
                      ${planMeta[plan].price}
                    </p>
                    <p className="text-[12px] text-white/55">per month</p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                      <Check size={14} /> Selected
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-5">
                <p className="text-sm font-semibold text-white/85">
                  Payment Method
                </p>
                <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80">
                    <CreditCard size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/90">
                      Credit Card / PayPal
                    </p>
                    <p className="mt-1 text-[12px] text-white/55">
                      Secure payment via card, debit card, or PayPal
                    </p>
                    <div className="mt-3 space-y-1 text-[12px] text-white/60">
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={14} /> Instant
                        activation
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={14} /> Visa,
                        Mastercard, AmEx, Discover, PayPal
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="text-emerald-300" size={14} /> Secure &
                        encrypted
                      </div>
                    </div>
                  </div>
                </div>

                <GradientButton
                  type="button"
                  onClick={() => {
                    trackEvent("checkout.redirect", { plan, billing });
                    window.location.href = getCheckoutUrl(billing, plan);
                  }}
                  disabled={!isSignedIn && !guestEmailValid}
                  className="mt-5 w-full"
                  innerClassName="w-full px-4 py-3"
                >
                  Continue to Checkout
                </GradientButton>

                {!isSignedIn && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <label className="text-[12px] font-semibold text-white/80">
                      Checkout email
                    </label>
                    <input
                      value={guestEmail}
                      onChange={(e) =>
                        setGuestEmail(e.target.value.trim().toLowerCase())
                      }
                      placeholder="you@example.com"
                      inputMode="email"
                      className={`mt-2 w-full rounded-2xl bg-black/40 px-4 py-3 text-sm text-white/85 outline-none ring-1 transition ${
                        guestEmail.length === 0
                          ? "ring-white/10 focus:ring-indigo-300/40"
                          : guestEmailValid
                          ? "ring-emerald-400/30 focus:ring-emerald-400/40"
                          : "ring-red-400/30 focus:ring-red-400/40"
                      }`}
                    />
                    <p className="mt-2 text-[11px] text-white/45">
                      We’ll attach your plan + setup to this email automatically.
                    </p>
                  </div>
                )}

                <div className="mt-4 text-center text-[11px] text-white/45">
                  <span className="inline-flex items-center gap-2">
                    <Lock size={14} /> Private & Secure
                  </span>
                  <span className="mx-2 text-white/25">•</span>
                  Instant Access
                  <span className="mx-2 text-white/25">•</span>
                  Cancel Anytime
                </div>

                <div className="mt-2 text-center text-[10px] text-white/35">
                  By continuing, you agree to our Terms of Service and Privacy
                  Policy.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <FooterNav />

      {/* ✅ Global GX styles (your exact gradient button CSS + mobile rules + scrollbar) */}
      <style jsx global>{`
        /* Gradient buttons like your screenshot */
        .gx-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 9999px;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: linear-gradient(
            100deg,
            #2f3340 0%,
            #6d5dfc 45%,
            #6aa7ff 100%
          );
          box-shadow: 0 18px 60px rgba(109, 93, 252, 0.28);
          transform: translateZ(0);
        }
        .gx-btn::before {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 9999px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(0, 0, 0, 0.22) 100%
          );
          opacity: 0.75;
          pointer-events: none;
        }
        .gx-btn > * {
          position: relative;
          z-index: 1;
        }
        .gx-btn:hover {
          filter: brightness(1.06);
        }
        .gx-btn:active {
          transform: translateY(1px);
        }
        .gx-btn-sm::before {
          inset: 1px;
        }

        /* Outline variant that still feels like the same system */
        .gx-btn.gx-btn-outline {
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 18px 60px rgba(109, 93, 252, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .gx-btn.gx-btn-outline::before {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(0, 0, 0, 0.28) 100%
          );
          opacity: 0.55;
        }

        /* Small gradient “chips” used for billing toggle active state */
        .gx-chip-active {
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: linear-gradient(
            100deg,
            #2f3340 0%,
            #6d5dfc 45%,
            #6aa7ff 100%
          );
          box-shadow: 0 10px 40px rgba(109, 93, 252, 0.22);
        }

        /* Pro card CTA bar */
        .gx-cta-bar {
          border-radius: 16px;
          padding: 12px 16px;
          text-align: center;
          font-weight: 700;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(
            100deg,
            #2f3340 0%,
            #6d5dfc 45%,
            #6aa7ff 100%
          );
          box-shadow: 0 14px 48px rgba(109, 93, 252, 0.22);
          position: relative;
          overflow: hidden;
        }
        .gx-cta-bar::before {
          content: "";
          position: absolute;
          inset: 2px;
          border-radius: 14px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(0, 0, 0, 0.22) 100%
          );
          opacity: 0.75;
          pointer-events: none;
        }
        .gx-cta-muted {
          opacity: 0.88;
          background: linear-gradient(120deg, #111318 0%, #0b0c11 100%);
          color: rgba(255, 255, 255, 0.78);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        /* Mini selector bars for Basic/Elite cards */
        .gx-mini {
          border-radius: 16px;
          padding: 10px 16px;
          text-align: center;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.22);
          color: rgba(255, 255, 255, 0.82);
        }
        .gx-mini.gx-mini-active {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(
            100deg,
            #2f3340 0%,
            #6d5dfc 45%,
            #6aa7ff 100%
          );
          box-shadow: 0 14px 48px rgba(109, 93, 252, 0.18);
        }

        /* Icon badge (Pro crown) */
        .gx-icon-badge {
          background: linear-gradient(
            100deg,
            #2f3340 0%,
            #6d5dfc 45%,
            #6aa7ff 100%
          );
        }

        @media (max-width: 459px) {
          html,
          body {
            overflow-x: hidden !important;
          }
          * {
            max-width: 100%;
          }
          .gx-grid {
            justify-items: center !important;
          }
          .gx-hero-section {
            display: flex !important;
            justify-content: center !important;
            width: 100% !important;
          }
          .gx-hero-card {
            width: min(90vw, 720px) !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .gx-hero-title {
            font-size: 30px !important;
            line-height: 1.05 !important;
            letter-spacing: -0.02em !important;
          }
          .gx-hero-desc {
            font-size: 13px !important;
            line-height: 1.6 !important;
          }
        }

        .gx-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        .gx-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
        }
        .gx-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
