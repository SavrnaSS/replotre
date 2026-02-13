"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Wand2,
  Calendar,
  Globe,
  ShieldCheck,
  Lock,
  Gauge,
  BarChart3,
  Timer,
  Rocket,
  Layers,
} from "lucide-react";
import { BILLING_PLANS, type BillingKey, type PlanKey } from "@/app/config/billingPlans";
import { getDailyQuotaForPlan } from "@/app/lib/schedule";
import { getInfluencerById } from "@/app/data/influencers";

type OnboardingProfile = {
  data: Record<string, any>;
  plan?: string | null;
  billing?: string | null;
  completedAt?: string | null;
};

type UserAccount = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  credits?: number | null;
};

export default function WorkspaceDashboard() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackedView, setTrackedView] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    plan?: string | null;
    billing?: string | null;
    status?: string | null;
  } | null>(null);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const [changeRequest, setChangeRequest] = useState<any | null>(null);
  const [submittingChange, setSubmittingChange] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<
    Array<{
      id: string;
      time: string;
      label: string;
      title: string;
      src: string;
      scheduleDate: string;
      dateKey: string;
    }>
  >([]);
  const [scheduleExhausted, setScheduleExhausted] = useState(false);
  const [scheduleReason, setScheduleReason] = useState<string>("");
  const [usedSchedule, setUsedSchedule] = useState<Record<string, boolean>>({});
  const profileRef = useRef<HTMLDivElement | null>(null);

  const trackEvent = async (name: string, payload?: any) => {
    try {
      await fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payload }),
      });
    } catch {
      // noop
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/onboarding/status", { cache: "no-store" });
        const data = await res.json();
        if (active) setProfile(data?.profile ?? null);
      } catch {
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let interval: number | undefined;
    const loadBilling = async () => {
      try {
        const res = await fetch("/api/subscription/status", { cache: "no-store" });
        const data = await res.json();
        if (active) {
          setSubscriptionActive(Boolean(data?.active));
          setSubscriptionInfo({
            plan: data?.plan ?? null,
            billing: data?.billing ?? null,
            status: data?.status ?? null,
          });
        }
      } catch {
        if (active) setSubscriptionActive(false);
      } finally {
        if (active) setBillingLoaded(true);
      }
    };
    loadBilling();
    interval = window.setInterval(loadBilling, 20000);
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let interval: number | undefined;
    const loadCredits = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (active) {
          setCredits(data?.user?.credits ?? null);
          setUser(data?.user ?? null);
        }
      } catch {
        if (active) setCredits(null);
      }
    };
    loadCredits();
    interval = window.setInterval(loadCredits, 15000);
    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadRequest = async () => {
      try {
        const res = await fetch("/api/onboarding/change-request", {
          cache: "no-store",
        });
        const data = await res.json();
        if (active) setChangeRequest(data?.request ?? null);
      } catch {
        if (active) setChangeRequest(null);
      }
    };
    loadRequest();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || !billingLoaded) return;
    if (!subscriptionActive) {
      window.location.href = "/workspace";
    }
    if (!trackedView && subscriptionActive) {
      trackEvent("dashboard.viewed", {
        plan: subscriptionInfo?.plan ?? profile?.plan ?? null,
        billing: subscriptionInfo?.billing ?? profile?.billing ?? null,
      });
      setTrackedView(true);
    }
  }, [
    loading,
    billingLoaded,
    subscriptionActive,
    profile?.plan,
    profile?.billing,
    subscriptionInfo?.plan,
    subscriptionInfo?.billing,
    trackedView,
  ]);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!profileRef.current) return;
      if (!profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [profileOpen]);

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
        trackEvent("onboarding.change_request_submitted");
      }
    } catch {
      // noop
    } finally {
      setSubmittingChange(false);
    }
  };

  const unlockSetup = async () => {
    setUnlocking(true);
    try {
      await fetch("/api/onboarding/unlock", { method: "POST" });
      trackEvent("onboarding.unlock_clicked");
      window.location.href = "/workspace";
    } catch {
      // noop
    } finally {
      setUnlocking(false);
    }
  };

  const restoreProfile = async () => {
    setRestoring(true);
    try {
      const res = await fetch("/api/onboarding/restore", { method: "POST" });
      const data = await res.json();
      if (data?.profile) setProfile(data.profile);
      trackEvent("onboarding.restore_clicked");
    } catch {
      // noop
    } finally {
      setRestoring(false);
    }
  };

  const summary = useMemo(() => {
    const d = profile?.data || {};
    const influencerId = d.influencerId || "";
    const selectedInfluencer = getInfluencerById(influencerId);
    return {
      aiName: d.aiName || selectedInfluencer?.name || "Your AI",
      influencerId,
      niche: d.niche || "—",
      style: d.visualStyle || "—",
      frequency: d.frequency || "—",
      platforms: Object.entries(d.platforms || {})
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", "),
      method: d.method || "—",
      experience: d.experience || "—",
      goal: d.goal || "—",
      influencer: selectedInfluencer,
    };
  }, [profile]);

  const storageKey = useMemo(() => {
    const suffix = summary.influencerId || "default";
    return `gx_schedule_used_${suffix}`;
  }, [summary.influencerId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const id = summary.influencerId || "";
      if (!id) {
        setScheduleItems([]);
        setScheduleExhausted(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/influencers/schedule-queue?influencerId=${id}&days=1`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (active) {
          const nextItems = Array.isArray(data?.items) ? data.items : [];
          setScheduleItems(nextItems);
          const exhausted = Boolean(data?.exhausted) && nextItems.length === 0;
          setScheduleExhausted(exhausted);
          setScheduleReason(exhausted ? String(data?.reason || "") : "");
        }
      } catch {
        if (active) {
          setScheduleItems([]);
          setScheduleExhausted(false);
          setScheduleReason("");
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [summary.influencerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setUsedSchedule(JSON.parse(raw));
      } else {
        setUsedSchedule({});
      }
    } catch {
      setUsedSchedule({});
    }
  }, [storageKey]);

  const markUsed = (key: string) => {
    setUsedSchedule((prev) => {
      const next = { ...prev, [key]: true };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // noop
      }
      return next;
    });
  };

  const makeItemKey = (id: string, src: string) =>
    `${summary.influencerId || "default"}:${id}-${src}`;

  const nextActions = useMemo(() => {
    const items: Array<{
      label: string;
      href: string;
      icon: React.ReactNode;
    }> = [];
    const d = profile?.data || {};
    const hasInfluencer = Boolean(summary.influencer);
    const hasChannels = Boolean(summary.platforms);

    if (hasInfluencer) {
      items.push({
        label: "Review creator model",
        href: "/influencer",
        icon: <Sparkles size={16} />,
      });
    } else {
      items.push({
        label: "Select a creator model",
        href: "/workspace",
        icon: <Sparkles size={16} />,
      });
    }

    if (credits !== null && credits <= 0) {
      items.push({
        label: "Top up studio credits",
        href: "/subscription",
        icon: <Calendar size={16} />,
      });
    } else {
      items.push({
        label:
          d.niche === "fitness"
            ? "Create a Influencer photoshoot set"
            : d.niche === "travel"
            ? "Create a travel photoshoot set"
            : "Create your first studio set",
        href: "/generate",
        icon: <Wand2 size={16} />,
      });
    }

    if (hasChannels) {
      items.push({
        label: "Tune your channel mix",
        href: "/channels",
        icon: <Globe size={16} />,
      });
    } else {
      items.push({
        label: "Set your channels",
        href: "/workspace",
        icon: <Globe size={16} />,
      });
    }

    items.push({
      label: "Review subscription",
      href: "/subscription",
      icon: <Calendar size={16} />,
    });

    return items.slice(0, 4);
  }, [profile, summary, credits]);

  const planRules = useMemo(() => {
    const plan = (subscriptionInfo?.plan || profile?.plan || "").toLowerCase();
    if (plan === "elite") {
      return {
        cadence: "6 posts/day",
        priority: "Priority queue + premium themes",
        support: "Dedicated support",
      };
    }
    if (plan === "pro") {
      return {
        cadence: "2 posts/day",
        priority: "Fast queue + pro themes",
        support: "Priority support",
      };
    }
    return {
      cadence: "1 post every 2 days",
      priority: "Standard queue + core themes",
      support: "Standard support",
    };
  }, [profile?.plan, subscriptionInfo?.plan]);

  const planKey = (subscriptionInfo?.plan || profile?.plan || "basic").toLowerCase();
  const billingKey: BillingKey =
    subscriptionInfo?.billing === "yearly" || profile?.billing === "yearly" ? "yearly" : "monthly";
  const planKeyTyped: PlanKey =
    planKey === "elite" || planKey === "pro" ? (planKey as PlanKey) : "basic";
  const planEntry = BILLING_PLANS[billingKey][planKeyTyped];
  const billingLabel =
    subscriptionInfo?.billing === "yearly" || profile?.billing === "yearly"
      ? "annual"
      : "monthly";
  const planBadge = useMemo(() => {
    if (planKey === "elite") {
      return {
        label: "Elite",
        pill: "border-amber-300/30 bg-amber-400/10 text-amber-100",
        glow: "from-amber-500/20 via-white/[0.05] to-fuchsia-500/15",
      };
    }
    if (planKey === "pro") {
      return {
        label: "Pro",
        pill: "border-indigo-300/35 bg-indigo-500/15 text-indigo-100",
        glow: "from-indigo-500/20 via-white/[0.05] to-sky-500/15",
      };
    }
    return {
      label: "Basic",
      pill: "border-slate-300/25 bg-white/5 text-white/70",
      glow: "from-slate-500/10 via-white/[0.04] to-slate-500/10",
    };
  }, [planKey]);

  const planCapabilities = useMemo(
    () => ({
      credits: planEntry?.credits ?? 0,
      modelTokens: planKey === "elite" ? 6 : planKey === "pro" ? 2 : 1,
      scheduledPosts: planKey === "elite" ? 180 : planKey === "pro" ? 60 : 15,
      nsfwScheduled: planKey !== "basic",
      videoEnabled: planKey !== "basic",
    }),
    [planEntry?.credits, planKey]
  );

  const telemetry = useMemo(
    () => [
      { label: "Studio load", value: planKey === "elite" ? 18 : planKey === "pro" ? 28 : 42 },
      { label: "Render latency", value: planKey === "elite" ? 22 : planKey === "pro" ? 35 : 48 },
      { label: "Queue depth", value: planKey === "elite" ? 12 : planKey === "pro" ? 24 : 38 },
      { label: "Content readiness", value: planKey === "elite" ? 86 : planKey === "pro" ? 74 : 62 },
    ],
    [planKey]
  );

  const initials = useMemo(() => {
    const label = user?.name || user?.email || "User";
    const parts = label.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return `${first}${second}`.toUpperCase() || "U";
  }, [user?.name, user?.email]);

  const activity = useMemo(
    () => [
      {
        label: "Studio set compiled",
        detail: `${summary.niche} • ${summary.style}`,
        time: "12 min ago",
      },
      {
        label: "Queue optimized",
        detail: `${planRules.priority}`,
        time: "43 min ago",
      },
      {
        label: "Channel mix synced",
        detail: summary.platforms || "No channels set",
        time: "2 hrs ago",
      },
    ],
    [summary.niche, summary.style, summary.platforms, planRules.priority]
  );

  const schedulePreview = useMemo(() => {
    const limit = getDailyQuotaForPlan(planKey, 0);
    return scheduleItems.slice(0, limit);
  }, [planKey, scheduleItems]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07070B] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <style jsx global>{`
        @keyframes gxReveal {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .gx-reveal {
          opacity: 1;
          animation: gxReveal 0.7s ease forwards;
        }
        .gx-card-ambient {
          transition: transform 0.35s ease, box-shadow 0.35s ease;
        }
        .gx-card-ambient:hover {
          transform: translateY(-2px);
          box-shadow: 0 24px 120px rgba(64, 120, 255, 0.18);
        }
      `}</style>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/55">
              AI Influencer Creator Studio
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {summary.aiName}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              {planBadge.label} plan • {billingLabel} • Production-grade creator suite
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Studio status: <span className="font-semibold text-white/85">Live</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Credits available:{" "}
                <span className="font-semibold text-white/85">{credits ?? "—"}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Queue tier:{" "}
                <span className="font-semibold text-white/85">{planRules.priority}</span>
              </span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={unlockSetup}
              disabled={unlocking}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
            >
              {unlocking ? "Unlocking..." : "Edit creator setup"}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={restoreProfile}
              disabled={restoring}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50"
            >
              {restoring ? "Restoring..." : "Restore creator setup"}
            </button>
            <Link
              href="/subscription"
              className="inline-flex col-span-2 items-center justify-center gap-2 rounded-full border border-indigo-300/40 bg-gradient-to-r from-indigo-500/30 via-indigo-500/20 to-sky-500/30 px-4 py-2 text-sm text-white/95 shadow-[0_18px_50px_rgba(94,169,255,0.2)] transition hover:brightness-110 sm:col-span-1"
            >
              Manage plan
            </Link>
            <div
              ref={profileRef}
              className="absolute right-0 top-0 col-span-2 sm:static sm:col-span-1 sm:top-auto sm:right-auto"
            >
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1a1a1c] text-sm font-bold text-white/80 shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-200 hover:border-white/20 hover:shadow-[0_0_18px_rgba(255,255,255,0.18)]"
              >
                {initials}
              </button>
              {profileOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0f1018] p-2 text-sm text-white/80 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">
                  <div className="px-3 py-2">
                    <p className="text-xs text-white/50">Signed in as</p>
                    <p className="mt-1 text-sm font-semibold text-white/90">
                      {user?.name || "Creator"}
                    </p>
                    <p className="text-xs text-white/60">{user?.email || "—"}</p>
                  </div>
                  <div className="my-2 h-px bg-white/10" />
                  <Link
                    href="/profile"
                    className="block rounded-xl px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    Profile settings
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch("/api/logout", { method: "POST" });
                      window.location.href = "/";
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs text-rose-200 hover:bg-rose-500/10"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div
            className="gx-reveal gx-card-ambient relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            style={{ animationDelay: "0.04s" }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className={`absolute inset-0 bg-gradient-to-r ${planBadge.glow}`} />
              <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-indigo-500/25 blur-[100px]" />
              <div className="absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-[110px]" />
            </div>
            <div className="relative">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/60">
                    Studio access
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white/95">
                    Private creator playground
                  </h2>
                  <p className="mt-2 text-sm text-white/65">
                    {planRules.priority} • {planRules.support} • {billingLabel} billing
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${planBadge.pill}`}
                  >
                    <ShieldCheck size={12} /> {planBadge.label} access
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100/90">
                    <Lock size={12} /> Zero-share outputs
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/70">
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  Model tokens:{" "}
                  <span className="font-semibold text-white/90">
                    {planCapabilities.modelTokens}
                  </span>
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  Scheduled posts:{" "}
                  <span className="font-semibold text-white/90">
                    {planCapabilities.scheduledPosts}
                  </span>
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${
                    planCapabilities.videoEnabled
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                      : "border-rose-300/30 bg-rose-500/10 text-rose-100/90"
                  }`}
                >
                  Video: {planCapabilities.videoEnabled ? "Enabled" : "Upgrade to Pro"}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 ${
                    planCapabilities.nsfwScheduled
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                      : "border-rose-300/30 bg-rose-500/10 text-rose-100/90"
                  }`}
                >
                  NSFW schedule:{" "}
                  {planCapabilities.nsfwScheduled ? "Enabled" : "Upgrade to Pro"}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <Gauge size={14} /> Render queue
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white/90">
                    {planKey === "elite" ? "Priority lane" : planKey === "pro" ? "Fast lane" : "Standard"}
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">
                    Real-time throughput optimized
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <BarChart3 size={14} /> Studio uptime
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white/90">99.9%</p>
                  <p className="mt-1 text-[11px] text-white/50">
                    SLA-backed reliability
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center gap-2 text-xs text-white/55">
                    <Timer size={14} /> Review window
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white/90">
                    {planKey === "elite" ? "4 hours" : planKey === "pro" ? "8 hours" : "24 hours"}
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">
                    Managed delivery SLA
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                      Studio schedule
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      {planRules.cadence} • {planCapabilities.scheduledPosts} posts / 30 days
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-white/60">
                    Next 24h
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/50">
                  Scheduled posts are auto-published from your influencer queue. Download any asset
                  or manage the queue in Schedule.
                </p>
                {scheduleExhausted && (
                  <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                    {scheduleReason === "admin-disabled"
                      ? "Scheduling is paused by admin. We’ll notify you when it resumes."
                      : "Scheduling is currently unavailable. We’ll get back to you ASAP."}
                  </div>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {schedulePreview.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.src}
                          alt="Scheduled preview"
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="text-xs font-semibold text-white/90">{item.time}</p>
                          <p className="text-[10px] text-white/50">{item.label}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-white/65">{item.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-white/60">
                          {usedSchedule[makeItemKey(item.id, item.src)] ? "Downloaded" : "Scheduled"}
                        </span>
                        <a
                          href={item.src}
                          download
                          onClick={() => markUsed(makeItemKey(item.id, item.src))}
                          className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] text-indigo-100 transition hover:bg-indigo-500/20"
                        >
                          {usedSchedule[makeItemKey(item.id, item.src)] ? "Downloaded" : "Download"}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => (window.location.href = "/schedule")}
                  className="mt-4 w-full rounded-full border border-indigo-300/30 bg-indigo-500/15 px-4 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/25"
                >
                  Manage schedule
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/60">
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  Credits ready:{" "}
                  <span className="font-semibold text-white/90">{credits ?? "—"}</span>
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  Monthly credits:{" "}
                  <span className="font-semibold text-white/90">
                    {planCapabilities.credits}
                  </span>
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  Cadence: <span className="font-semibold text-white/90">{planRules.cadence}</span>
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  Channels: <span className="font-semibold text-white/90">{summary.platforms || "Not set"}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div
              className="gx-reveal gx-card-ambient rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.07] via-white/[0.04] to-black/30 p-5 backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.35)]"
              style={{ animationDelay: "0.12s" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                    Studio health
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">Operational status</h3>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100/90">
                  Live
                </span>
              </div>
              <p className="mt-2 text-xs text-white/55">
                Protected environment with verified delivery SLAs.
              </p>
              <div className="mt-4 space-y-3 text-xs text-white/65">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={13} /> Security vault
                  </span>
                  <span className="text-emerald-200">Locked</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <Layers size={13} /> Model cache
                  </span>
                  <span className="text-indigo-200">Optimized</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <Rocket size={13} /> Priority routing
                  </span>
                  <span className="text-sky-200">
                    {planKey === "elite" ? "Enabled" : planKey === "pro" ? "Fast" : "Standard"}
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/60">
                SLA tier: <span className="font-semibold text-white/85">{planBadge.label}</span> •
                Response window:{" "}
                <span className="font-semibold text-white/85">
                  {planKey === "elite" ? "4 hrs" : planKey === "pro" ? "8 hrs" : "24 hrs"}
                </span>
              </div>
            </div>

            <div
              className="gx-reveal gx-card-ambient rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.07] via-white/[0.04] to-black/30 p-5 backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.35)]"
              style={{ animationDelay: "0.2s" }}
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                Quick launch
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/generate")}
                  className="group rounded-2xl border border-indigo-300/35 bg-gradient-to-r from-indigo-500/25 via-indigo-500/15 to-sky-500/25 px-4 py-3 text-left text-sm text-white/95 shadow-[0_16px_50px_rgba(94,169,255,0.18)] transition hover:brightness-110"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Wand2 size={16} /> Start a studio set
                    </span>
                    <ArrowRight size={16} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/60">
                    Launch a batch aligned to your creator brief.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => (window.location.href = "/schedule")}
                  className="group rounded-2xl border border-indigo-300/25 bg-gradient-to-r from-fuchsia-500/20 via-indigo-500/15 to-sky-500/20 px-4 py-3 text-left text-sm text-white/95 shadow-[0_16px_50px_rgba(156,111,255,0.18)] transition hover:brightness-110"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={16} /> View schedule
                    </span>
                    <ArrowRight size={16} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/60">
                    Preview the next 24h scheduled queue.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => (window.location.href = "/channels")}
                  className="group rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-black/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Globe size={16} /> Tune channels
                    </span>
                    <ArrowRight size={16} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/55">
                    Adjust platform distribution and sizing.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (planCapabilities.videoEnabled) {
                      window.location.href = "/generate";
                    }
                  }}
                  className={`group rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    planCapabilities.videoEnabled
                      ? "border-white/10 bg-black/40 text-white/80 hover:bg-black/50"
                      : "border-white/5 bg-black/20 text-white/40 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Wand2 size={16} /> Video batch
                    </span>
                    <ArrowRight size={16} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/55">
                    Render short-form clips with studio scenes.
                  </p>
                  {!planCapabilities.videoEnabled && (
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-500/10 px-2.5 py-1 text-[10px] text-indigo-200">
                      Upgrade to Pro
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (planCapabilities.nsfwScheduled) {
                      window.location.href = "/generate";
                    }
                  }}
                  className={`group rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    planCapabilities.nsfwScheduled
                      ? "border-white/10 bg-black/40 text-white/80 hover:bg-black/50"
                      : "border-white/5 bg-black/20 text-white/40 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Lock size={16} /> NSFW scheduled posts
                    </span>
                    <ArrowRight size={16} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/55">
                    Schedule gated content to private feeds.
                  </p>
                  {!planCapabilities.nsfwScheduled && (
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-300/25 bg-indigo-500/10 px-2.5 py-1 text-[10px] text-indigo-200">
                      Upgrade to Pro
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => (window.location.href = "/influencer")}
                  className="group rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-black/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Sparkles size={16} /> Review creator model
                    </span>
                    <ArrowRight size={16} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/55">
                    View your selected creator model.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => (window.location.href = "/subscription")}
                  className="group rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left text-sm text-white/80 transition hover:bg-black/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={16} /> Billing center
                    </span>
                    <ArrowRight size={16} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/55">
                    Manage plan, credits, and invoices.
                  </p>
                </button>
              </div>
            </div>

            <div
              className="gx-reveal gx-card-ambient rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.03] to-black/30 p-5 backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.35)]"
              style={{ animationDelay: "0.24s" }}
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                Plan capabilities
              </p>
              <div className="mt-4 space-y-3 text-xs text-white/70">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>Monthly credits</span>
                  <span className="font-semibold text-white/85">{planCapabilities.credits}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>Model tokens / month</span>
                  <span className="font-semibold text-white/85">{planCapabilities.modelTokens}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>Scheduled posts</span>
                  <span className="font-semibold text-white/85">{planCapabilities.scheduledPosts}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>NSFW scheduled posts</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      planCapabilities.nsfwScheduled
                        ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border border-rose-300/30 bg-rose-500/10 text-rose-100"
                    }`}
                  >
                    {planCapabilities.nsfwScheduled ? "Enabled" : "Upgrade to Pro"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <span>Video generation</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      planCapabilities.videoEnabled
                        ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border border-rose-300/30 bg-rose-500/10 text-rose-100"
                    }`}
                  >
                    {planCapabilities.videoEnabled ? "Enabled" : "Upgrade to Pro"}
                  </span>
                </div>
              </div>
              {!planCapabilities.videoEnabled && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/subscription")}
                  className="mt-4 w-full rounded-full border border-indigo-300/30 bg-indigo-500/15 px-4 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/25"
                >
                  Upgrade plan
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div
            className="gx-reveal gx-card-ambient rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-black/30 p-6 backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.35)]"
            style={{ animationDelay: "0.28s" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                  Studio telemetry
                </p>
                <h3 className="mt-2 text-lg font-semibold">Operational signals</h3>
                <p className="mt-2 text-xs text-white/55">
                  Live performance indicators across your creator studio.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/60">
                Live metrics
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {telemetry.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between text-xs text-white/55">
                    <span>{item.label}</span>
                    <span className="text-white/70">{item.value}%</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400/70 via-sky-400/60 to-fuchsia-400/70"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="gx-reveal gx-card-ambient rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-black/30 p-6 backdrop-blur-xl shadow-[0_24px_90px_rgba(0,0,0,0.35)]"
            style={{ animationDelay: "0.34s" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                  Studio feed
                </p>
                <h3 className="mt-2 text-lg font-semibold">Recent activity</h3>
                <p className="mt-2 text-xs text-white/55">
                  Automated checkpoints from your latest creator actions.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100/90">
                Synced
              </span>
            </div>
            <div className="mt-5 space-y-3 text-sm text-white/70">
              {activity.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="text-white/85">{item.label}</p>
                    <p className="mt-1 text-xs text-white/50">{item.detail}</p>
                  </div>
                  <span className="text-xs text-white/45">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.05] p-6">
            Loading your playground...
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-black/30 p-6 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
              <div
                id="influencer"
                className="relative overflow-hidden rounded-[26px] border border-indigo-300/25 bg-gradient-to-r from-indigo-500/15 via-white/[0.06] to-fuchsia-500/10 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.45)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-60">
                  <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full bg-indigo-500/25 blur-[90px]" />
                  <div className="absolute -left-24 -bottom-24 h-52 w-52 rounded-full bg-fuchsia-500/20 blur-[90px]" />
                </div>

                <div className="relative">
                  <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-indigo-100/80">
                    Creator model
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                      Live
                    </span>
                  </div>

                  {summary.influencer ? (
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={summary.influencer.src}
                          alt={summary.influencer.name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-indigo-300/40" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {summary.influencer.name}
                        </div>
                        <div className="text-sm text-white/70">
                          {summary.influencer.subtitle}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/75">
                          Studio distribution • SLA‑backed delivery
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-white/60">—</p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Credits
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {credits ?? "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">
                    Ready for creation
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Content cadence
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {planRules.cadence}
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">
                    Studio delivery schedule
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    Plan status
                  </p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                    Active • {profile?.billing || "billing"}
                  </div>
                  <p className="mt-2 text-[11px] text-white/50">
                    {profile?.plan ? `${profile.plan} plan` : "Active plan"}
                  </p>
                </div>
              </div>

              <div id="profile" className="mt-6 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20">
                  <Sparkles size={18} className="text-indigo-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Creator profile
                  </p>
                  <h2 className="text-lg font-semibold">Influencer setup</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs text-white/45">Niche</p>
                  <p className="mt-1 text-base font-semibold">{summary.niche}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs text-white/45">Style</p>
                  <p className="mt-1 text-base font-semibold">{summary.style}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs text-white/45">Publishing</p>
                  <p className="mt-1 text-base font-semibold">{summary.frequency}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs text-white/45">Channels</p>
                  <p className="mt-1 text-base font-semibold">
                    {summary.platforms || "—"}
                  </p>
                </div>
              </div>

              <div
                id="feed"
                className="mt-5 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4"
              >
                <p className="text-xs text-white/45">Recommended feed</p>
                <p className="mt-1 text-sm text-white/85">
                  We’ll auto‑prioritize <span className="font-semibold">{summary.niche}</span>{" "}
                  content in <span className="font-semibold">{summary.style}</span>{" "}
                  style, optimized for <span className="font-semibold">{summary.platforms || "your channels"}</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1">
                    {summary.frequency} cadence
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1">
                    {planRules.cadence}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1">
                    {summary.method} workflow
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1">
                    {planRules.priority}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1">
                    {planRules.support}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1">
                    {summary.goal} goal
                  </span>
                </div>
              </div>
            </div>


            <div className="rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] via-white/[0.04] to-black/30 p-6 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
              <h3 className="text-lg font-semibold">Studio change request</h3>
              <p className="mt-1 text-sm text-white/60">
                Submit updates to your creator brief. Our team reviews within your SLA window.
              </p>
              {changeRequest?.status && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/70">
                  Latest request:{" "}
                  <span className="font-semibold">{changeRequest.status}</span>
                </div>
              )}
              <textarea
                value={changeMessage}
                onChange={(e) => setChangeMessage(e.target.value)}
                rows={3}
                placeholder="Describe what you want to change (e.g., switch niche, add TikTok, adjust cadence)."
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
        )}

      </div>

    </main>
  );
}
