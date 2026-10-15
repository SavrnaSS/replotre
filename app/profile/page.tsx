"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Mail,
  User,
  Wand2,
  Zap,
} from "lucide-react";
import AppShell, { APP_CONTENT_PAD } from "@/app/components/shell/AppShell";

type UserAccount = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  credits?: number | null;
};

type SubscriptionInfo = {
  active?: boolean;
  plan?: string | null;
  billing?: string | null;
  status?: string | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function initialsOf(user: UserAccount | null) {
  const src = (user?.name || user?.email || "").trim();
  if (!src) return "·";
  const parts = src.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2)).toUpperCase();
}

function titleCase(s?: string | null) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function Skeleton({ className }: { className?: string }) {
  return <span className={cx("block animate-pulse rounded-lg bg-white/[0.08]", className)} />;
}

const QUICK_LINKS = [
  { href: "/playground", label: "Studio", desc: "Overview & activity", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", desc: "Create a photoshoot set", icon: Wand2 },
  { href: "/schedule", label: "Schedule", desc: "Your posting queue", icon: CalendarDays },
  { href: "/subscription", label: "Billing", desc: "Plan, credits & invoices", icon: CreditCard },
];

export default function ProfilePage() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [meRes, subRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/subscription/status", { cache: "no-store" }).catch(() => null),
        ]);
        const me = await meRes.json().catch(() => null);
        const subData = subRes ? await subRes.json().catch(() => null) : null;
        if (!active) return;
        setUser(me?.user ?? null);
        setSub(subData);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const copyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (e.g. insecure context) — ignore
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  const planLabel = sub?.active ? `${titleCase(sub.plan) || "Active"} plan` : "No active plan";
  const credits = typeof user?.credits === "number" ? user.credits : null;

  return (
    <AppShell>
      <div className={`relative z-10 mx-auto max-w-4xl ${APP_CONTENT_PAD}`}>
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Account</p>
        <h1 className="mt-2 text-[clamp(26px,4vw,34px)] font-semibold tracking-tight">
          Profile
        </h1>

        {/* Identity */}
        <section className="rp-card mt-6 flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:p-7 sm:text-left">
          <div className="relative shrink-0">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-violet-500/40 to-sky-500/30 blur-lg" />
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-violet-500/60 to-sky-500/50 text-2xl font-semibold">
              {loading ? null : user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                initialsOf(user)
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (
              <>
                <p className="truncate text-xl font-semibold">{user?.name || "Creator"}</p>
                <p className="mt-0.5 truncate text-sm text-white/55">{user?.email || "—"}</p>
              </>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                  sub?.active
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-white/60"
                )}
              >
                <span
                  className={cx(
                    "h-1.5 w-1.5 rounded-full",
                    sub?.active ? "bg-emerald-400" : "bg-white/40"
                  )}
                />
                {loading ? "Checking plan…" : planLabel}
              </span>
              {sub?.active && sub.billing && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">
                  Billed {sub.billing}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/subscription"
            className="rp-ghost h-11 w-full shrink-0 px-5 text-sm font-semibold sm:w-auto"
          >
            Manage plan
            <ArrowRight size={15} />
          </Link>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          {/* Credits */}
          <section className="rp-card relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative">
              <p className="flex items-center gap-2 text-[12px] text-white/55">
                <Zap size={14} className="text-sky-300" /> Credits available
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-10 w-32" />
              ) : (
                <p className="mt-2 text-[44px] font-semibold leading-none tracking-tight tabular-nums">
                  {credits != null ? new Intl.NumberFormat("en-US").format(credits) : "—"}
                </p>
              )}
              <p className="mt-3 text-[13px] text-white/50">
                Each generated image uses 1 credit.
              </p>
              <Link href="/subscription" className="rp-btn mt-5 h-11 w-full text-sm font-semibold sm:w-auto sm:px-6">
                <Zap size={15} />
                Top up credits
              </Link>
            </div>
          </section>

          {/* Details */}
          <section className="rp-card p-6">
            <h2 className="text-[15px] font-semibold">Account details</h2>
            <dl className="mt-4 divide-y divide-white/[0.06]">
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <User size={16} className="text-indigo-200" />
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] text-white/45">Name</dt>
                  <dd className="truncate text-sm font-medium text-white/90">
                    {loading ? <Skeleton className="mt-1 h-4 w-32" /> : user?.name || "—"}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Mail size={16} className="text-indigo-200" />
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] text-white/45">Email</dt>
                  <dd className="truncate text-sm font-medium text-white/90">
                    {loading ? <Skeleton className="mt-1 h-4 w-44" /> : user?.email || "—"}
                  </dd>
                </div>
                {user?.email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    aria-label={copied ? "Email copied" : "Copy email"}
                    className="rp-focus flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    {copied ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
                  </button>
                )}
              </div>
            </dl>
          </section>
        </div>

        {/* Quick links */}
        <section className="mt-5">
          <h2 className="sr-only">Shortcuts</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {QUICK_LINKS.map(({ href, label, desc, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="rp-focus group flex h-full flex-col gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4 transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-sky-500/10">
                    <Icon size={16} className="text-sky-200" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      {label}
                      <ArrowRight size={13} className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                    </span>
                    <span className="mt-0.5 block text-[12px] text-white/45">{desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Session */}
        <section className="mt-5 flex flex-col items-start justify-between gap-4 rounded-[20px] border border-rose-400/15 bg-rose-500/[0.04] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold">Sign out</h2>
            <p className="mt-0.5 text-[13px] text-white/50">End your session on this device.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-rose-300/30 bg-rose-500/10 px-5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
          >
            {loggingOut ? <span className="rp-spinner" aria-hidden /> : <LogOut size={16} />}
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </section>
      </div>
    </AppShell>
  );
}
