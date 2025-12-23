"use client";

import useAuth from "@/app/hooks/useAuth";
import Link from "next/link";
import {
  Mail,
  User2,
  Coins,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]">
        <div className="absolute -top-28 left-1/2 -translate-x-1/2 h-56 w-[520px] rounded-full bg-gradient-to-r from-indigo-500/15 via-fuchsia-500/12 to-purple-500/15 blur-2xl" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
            {label}
          </p>
          <p className="mt-0.5 text-sm text-white/90 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user)
    return (
      <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <div className="mx-auto mb-4 h-10 w-10 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
          <p className="text-white/70">Loading profile...</p>
        </div>
      </div>
    );

  const base = user?.name || user?.email || "U";
  const letter = base[0]?.toUpperCase() || "U";

  const name = user?.name || "Unnamed";
  const email = user?.email || "—";
  const credits = typeof user?.credits === "number" ? user.credits : Number(user?.credits ?? 0);

  return (
    <div className="relative min-h-screen bg-[#07070B] text-white overflow-hidden">
      {/* Ambient BG */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        {/* Header */}
        <GlassCard className="p-5 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              {/* Avatar */}
              <div className="relative h-16 w-16 rounded-3xl overflow-hidden border border-white/12 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shadow">
                <div className="absolute inset-0 bg-[radial-gradient(110px_90px_at_30%_20%,rgba(168,85,247,0.25),transparent)]" />
                <span className="relative text-2xl font-bold">{letter}</span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-semibold truncate">
                    {name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                    <ShieldCheck size={14} className="text-emerald-300" />
                    Verified
                  </span>
                </div>
                <p className="text-sm text-white/55 truncate">{email}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[12px] text-white/70">
                    <Sparkles size={14} className="text-purple-200" />
                    Gerox member
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[12px] text-white/70">
                    <Coins size={14} className="text-emerald-200" />
                    {Number.isFinite(credits) ? credits.toLocaleString() : "—"} credits
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/billing"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black font-semibold px-5 py-3 hover:bg-gray-200 transition shadow"
              >
                Manage Billing <ArrowRight size={16} />
              </Link>

              <button
                onClick={async () => {
                  await fetch("/api/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 py-3 font-semibold text-white/90 hover:bg-white/10 transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Content grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Personal info */}
          <GlassCard className="p-5 sm:p-6 lg:col-span-7">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              Account
            </p>
            <h2 className="mt-1 text-lg sm:text-xl font-semibold">
              Personal information
            </h2>
            <p className="mt-1 text-[12px] sm:text-sm text-white/55">
              Your profile details used for login and personalization.
            </p>

            <div className="mt-5 space-y-3">
              <InfoRow
                icon={<User2 size={16} className="text-white/80" />}
                label="Full name"
                value={name}
              />
              <InfoRow
                icon={<Mail size={16} className="text-white/80" />}
                label="Email"
                value={email}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white/85">Security</p>
              <p className="mt-1 text-[12px] text-white/55">
                Use Google login or a strong password. We recommend enabling 2FA
                if you add it later.
              </p>
            </div>
          </GlassCard>

          {/* Right: Credits */}
          <GlassCard className="p-5 sm:p-6 lg:col-span-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              Billing
            </p>
            <h2 className="mt-1 text-lg sm:text-xl font-semibold">
              Credits & usage
            </h2>
            <p className="mt-1 text-[12px] sm:text-sm text-white/55">
              Credits are used for generation and downloads.
            </p>

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                    <Coins size={18} className="text-emerald-200" />
                  </div>
                  <div>
                    <p className="text-[12px] text-white/60">Available credits</p>
                    <p className="text-3xl font-bold tracking-tight">
                      {Number.isFinite(credits) ? credits.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                <Link
                  href="/billing"
                  className="hidden sm:inline-flex items-center gap-2 rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:bg-gray-200 transition"
                >
                  Add credits <ArrowRight size={16} />
                </Link>
              </div>

              <Link
                href="/billing"
                className="sm:hidden mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white text-black font-semibold px-4 py-3 hover:bg-gray-200 transition"
              >
                Add credits <ArrowRight size={16} />
              </Link>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[12px] text-white/60">
                  Tip: Face-swap generations consume credits. Keep some balance
                  for re-generations and downloads.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/workspace"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 font-semibold text-white/90 hover:bg-white/10 transition"
              >
                Go to Workspace <ArrowRight size={16} />
              </Link>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
