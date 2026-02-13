"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { INFLUENCERS } from "@/app/data/influencers";

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
            <div className="mt-6 text-sm text-white/60">Loading creator model…</div>
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
              <div className="ml-auto flex flex-col gap-2">
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
            <div className="mt-6 text-sm text-white/60">
              No creator model selected yet. Complete the setup to choose one.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
