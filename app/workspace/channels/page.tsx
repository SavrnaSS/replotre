"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Lock } from "lucide-react";
import { BILLING_PLANS, type BillingKey, type PlanKey } from "@/app/config/billingPlans";

type OnboardingProfile = {
  data: Record<string, any>;
  plan?: string | null;
  billing?: string | null;
};

export default function ChannelsPage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    plan?: string | null;
    billing?: string | null;
    status?: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [profileRes, subRes] = await Promise.all([
          fetch("/api/onboarding/status", { cache: "no-store" }),
          fetch("/api/subscription/status", { cache: "no-store" }),
        ]);
        const data = await profileRes.json();
        const subData = await subRes.json();
        if (active) {
          setProfile(data?.profile ?? null);
          setSubscriptionInfo({
            plan: subData?.plan ?? null,
            billing: subData?.billing ?? null,
            status: subData?.status ?? null,
          });
        }
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

  const channels = useMemo(() => {
    const d = profile?.data || {};
    return Object.entries(d.platforms || {})
      .filter(([, v]) => v)
      .map(([k]) => k);
  }, [profile]);

  const planCapabilities = useMemo(() => {
    const plan = (subscriptionInfo?.plan || profile?.plan || "basic").toLowerCase();
    const billing =
      subscriptionInfo?.billing === "yearly" || profile?.billing === "yearly"
        ? "yearly"
        : "monthly";
    const entry = BILLING_PLANS[billing as BillingKey]?.[(plan as PlanKey) || "basic"];
    const isPro = plan === "pro";
    const isElite = plan === "elite";
    return {
      credits: entry?.credits ?? 0,
      modelTokens: isElite ? 6 : isPro ? 2 : 1,
      scheduledPosts: isElite ? 180 : isPro ? 60 : 15,
      nsfwScheduled: plan !== "basic",
      videoEnabled: plan !== "basic",
    };
  }, [profile?.billing, profile?.plan, subscriptionInfo]);

  const schedulePreview = useMemo(() => {
    const baseLabel =
      planCapabilities.scheduledPosts >= 180
        ? "High-frequency cadence"
        : planCapabilities.scheduledPosts >= 60
        ? "Daily cadence"
        : "Alternate-day cadence";
    const slots =
      planCapabilities.scheduledPosts >= 180
        ? ["8:00 AM", "10:30 AM", "1:00 PM", "3:30 PM", "6:00 PM", "8:30 PM"]
        : planCapabilities.scheduledPosts >= 60
        ? ["10:00 AM", "6:00 PM"]
        : ["11:30 AM"];
    return slots.map((time, index) => ({
      id: `${time}-${index}`,
      time,
      label: baseLabel,
      title: "Channel scheduled post",
    }));
  }, [planCapabilities.scheduledPosts]);

  const unlockSetup = async () => {
    setUnlocking(true);
    try {
      await fetch("/api/onboarding/unlock", { method: "POST" });
      window.location.href = "/workspace";
    } finally {
      setUnlocking(false);
    }
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

        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20">
              <Globe size={18} className="text-indigo-200" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Distribution
              </p>
              <h1 className="text-2xl font-semibold">Channel strategy</h1>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-white/60">Loading channels…</div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm text-white/70">
                Active channels:
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                {channels.length ? (
                  channels.map((channel) => (
                    <span
                      key={channel}
                      className="rounded-full border border-white/10 bg-black/30 px-2 py-1"
                    >
                      {channel}
                    </span>
                  ))
                ) : (
                  <span className="text-white/50">No channels set yet.</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Plan access
              </p>
              <div className="mt-3 space-y-2 text-xs text-white/70">
                <div className="flex items-center justify-between">
                  <span>Scheduled posts</span>
                  <span className="font-semibold text-white/85">{planCapabilities.scheduledPosts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Model tokens</span>
                  <span className="font-semibold text-white/85">{planCapabilities.modelTokens}</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Advanced scheduling
              </p>
              <div className="mt-3 grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!planCapabilities.videoEnabled) {
                      window.location.href = "/subscription";
                    }
                  }}
                  className={`rounded-2xl border px-3 py-2 text-left text-xs transition ${
                    planCapabilities.videoEnabled
                      ? "border-white/10 bg-black/30 text-white/80 hover:bg-black/40"
                      : "border-white/5 bg-black/20 text-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Video channel distribution</span>
                    {!planCapabilities.videoEnabled && <Lock size={14} />}
                  </div>
                  {!planCapabilities.videoEnabled && (
                    <span className="mt-2 inline-flex rounded-full border border-indigo-300/25 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] text-indigo-200">
                      Upgrade to Pro
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!planCapabilities.nsfwScheduled) {
                      window.location.href = "/subscription";
                    }
                  }}
                  className={`rounded-2xl border px-3 py-2 text-left text-xs transition ${
                    planCapabilities.nsfwScheduled
                      ? "border-white/10 bg-black/30 text-white/80 hover:bg-black/40"
                      : "border-white/5 bg-black/20 text-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>NSFW scheduled posts</span>
                    {!planCapabilities.nsfwScheduled && <Lock size={14} />}
                  </div>
                  {!planCapabilities.nsfwScheduled && (
                    <span className="mt-2 inline-flex rounded-full border border-indigo-300/25 bg-indigo-500/10 px-2.5 py-0.5 text-[10px] text-indigo-200">
                      Upgrade to Pro
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Scheduled queue preview</span>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[10px] text-white/60">
                Next 24h
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {schedulePreview.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <p className="text-xs font-semibold text-white/90">{item.time}</p>
                  <p className="text-[10px] text-white/50">{item.label}</p>
                  <p className="mt-2 text-[11px] text-white/65">{item.title}</p>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-white/60">
                    Scheduled
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <p className="text-sm text-white/80">
                Want to update your channel strategy?
              </p>
              <p className="mt-1 text-xs text-white/50">
                Update your setup to change platforms and cadence.
              </p>
            </div>
            <button
              type="button"
              onClick={unlockSetup}
              disabled={unlocking}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10 disabled:opacity-50"
            >
              {unlocking ? "Unlocking..." : "Edit channels"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
