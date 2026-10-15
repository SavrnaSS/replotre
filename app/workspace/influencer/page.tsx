"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { INFLUENCERS } from "@/app/data/influencers";
import AppShell, { APP_CONTENT_PAD } from "@/app/components/shell/AppShell";

type OnboardingProfile = {
  data: Record<string, any>;
  plan?: string | null;
  billing?: string | null;
  completedAt?: string | null;
};

const influencers = INFLUENCERS;

export default function InfluencerPage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

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

  const selected = useMemo(() => {
    const id = profile?.data?.influencerId;
    return influencers.find((x) => x.id === id) ?? null;
  }, [profile]);

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
    <AppShell>
      <div className={`relative z-10 mx-auto max-w-5xl ${APP_CONTENT_PAD}`}>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20">
              <Sparkles size={18} className="text-indigo-200" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Creator model
              </p>
              <h1 className="text-2xl font-semibold">Creator model profile</h1>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-5 rounded-3xl border border-white/10 bg-black/20 p-6" aria-busy="true" aria-label="Loading creator model">
              <span className="h-24 w-24 shrink-0 animate-pulse rounded-3xl bg-white/[0.08]" />
              <span className="flex-1 space-y-2">
                <span className="block h-5 w-40 animate-pulse rounded-lg bg-white/[0.08]" />
                <span className="block h-4 w-56 max-w-full animate-pulse rounded-lg bg-white/[0.06]" />
              </span>
            </div>
          ) : selected ? (
            <div className="mt-6 flex flex-wrap items-center gap-5 rounded-3xl border border-indigo-300/25 bg-gradient-to-r from-indigo-500/15 via-white/[0.06] to-fuchsia-500/10 p-6">
              <div className="h-24 w-24 overflow-hidden rounded-3xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.src}
                  alt={selected.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold">{selected.name}</div>
                <div className="text-sm text-white/70">{selected.subtitle}</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-white/75">
                  Studio distribution • SLA‑backed delivery
                </div>
              </div>
              <div className="flex w-full gap-2 sm:ml-auto sm:w-auto sm:flex-col [&>*]:flex-1 sm:[&>*]:flex-none">
                <button
                  type="button"
                  onClick={unlockSetup}
                  disabled={unlocking}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {unlocking ? "Unlocking..." : "Switch creator model"}
                </button>
                <Link
                  href="/generate"
                  className="inline-flex items-center justify-center rounded-full border border-indigo-300/30 bg-indigo-500/20 px-4 py-2 text-sm text-white/90 transition hover:bg-indigo-500/30"
                >
                  Generate content
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-black/20 px-6 py-12 text-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-violet-500/25 blur-xl" />
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/30 to-sky-500/20">
                  <Sparkles size={22} className="text-sky-200" />
                </div>
              </div>
              <h2 className="mt-5 text-lg font-semibold">No creator model yet</h2>
              <p className="mt-1.5 max-w-sm text-sm text-white/55">
                Complete the setup to choose the AI model your content is generated with.
              </p>
              <button
                type="button"
                onClick={unlockSetup}
                disabled={unlocking}
                className="rp-btn mt-6 h-11 px-6 text-sm font-semibold"
              >
                {unlocking ? <span className="rp-spinner" aria-hidden /> : <Sparkles size={15} />}
                {unlocking ? "Opening setup…" : "Choose a creator model"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
