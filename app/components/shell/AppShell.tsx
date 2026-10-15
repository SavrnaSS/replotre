"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  Globe,
  LayoutDashboard,
  LogOut,
  Sparkles,
  User,
  Wand2,
  Zap,
} from "lucide-react";

import useAuth from "@/app/hooks/useAuth";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
  /** Other paths that render the same screen (proxy aliases). */
  match: string[];
  mobile: boolean;
};

const NAV: NavItem[] = [
  { href: "/playground", label: "Studio", short: "Studio", icon: LayoutDashboard, match: ["/playground", "/workspace/dashboard"], mobile: true },
  { href: "/generate", label: "Generate", short: "Create", icon: Wand2, match: ["/generate", "/workspace/generate", "/playground/generate"], mobile: true },
  { href: "/schedule", label: "Schedule", short: "Schedule", icon: CalendarDays, match: ["/schedule"], mobile: true },
  { href: "/channels", label: "Channels", short: "Channels", icon: Globe, match: ["/channels", "/workspace/channels"], mobile: true },
  { href: "/influencer", label: "Model", short: "Model", icon: Sparkles, match: ["/influencer", "/workspace/influencer"], mobile: false },
  { href: "/subscription", label: "Billing", short: "Billing", icon: CreditCard, match: ["/subscription", "/workspace/subscription"], mobile: true },
];

/** Container padding for pages inside AppShell (clears the mobile tab bar). */
export const APP_CONTENT_PAD =
  "px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 lg:pb-16";

function isActive(item: NavItem, pathname: string) {
  return item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

function initialsOf(user: { name?: string | null; email?: string | null } | null) {
  const src = (user?.name || user?.email || "").trim();
  if (!src) return "·";
  const parts = src.split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2);
  return letters.toUpperCase();
}

function UserMenu() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  const photo = user?.image || user?.photo;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rp-focus relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-violet-500/40 to-sky-500/30 text-[13px] font-semibold text-white transition hover:border-white/30"
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          initialsOf(user)
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d1d]/95 p-1.5 shadow-[0_25px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-white/90">
                {user?.name || "Creator"}
              </p>
              <p className="truncate text-xs text-white/50">{user?.email || "—"}</p>
            </div>
            <div className="my-1 h-px bg-white/10" />
            <Link
              role="menuitem"
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-white/80 hover:bg-white/[0.07]"
            >
              <User size={15} /> Profile
            </Link>
            <Link
              role="menuitem"
              href="/subscription"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-white/80 hover:bg-white/[0.07]"
            >
              <CreditCard size={15} /> Billing &amp; plan
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
            >
              <LogOut size={15} /> {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreditsPill() {
  const { user } = useAuth();
  const credits = typeof user?.credits === "number" ? user.credits : null;
  return (
    <Link
      href="/subscription"
      className="rp-focus inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-[13px] text-white/80 transition hover:bg-white/[0.09]"
      aria-label={credits != null ? `${credits} credits — manage billing` : "Credits — manage billing"}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#6d5dfc] to-[#6aa7ff]">
        <Zap size={11} />
      </span>
      <span className="font-semibold tabular-nums text-white">
        {credits != null ? new Intl.NumberFormat("en-US").format(credits) : "—"}
      </span>
      <span className="hidden text-white/50 sm:inline">credits</span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-x-clip bg-[#07070B] text-white antialiased">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] max-w-[160vw] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      {/* Top bar */}
      <header
        className={cx(
          "sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-300",
          scrolled
            ? "border-white/[0.08] bg-[#07070B]/75 backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/playground"
            className="rp-focus relative h-9 w-[120px] shrink-0 rounded-lg sm:w-[140px]"
            aria-label="Replotre studio"
          >
            <Image
              src="/logo.png"
              alt="Replotre"
              fill
              unoptimized
              priority
              sizes="140px"
              className="origin-left scale-[1.35] object-contain object-left"
            />
          </Link>

          <nav
            aria-label="Studio"
            className="hidden items-center gap-0.5 rounded-full border border-white/[0.06] bg-black/25 p-1 lg:flex"
          >
            {NAV.map((item) => {
              const active = isActive(item, pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "rp-focus relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors",
                    active ? "text-white" : "text-white/55 hover:text-white"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="app-nav-pill"
                      className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.08]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={14} className="relative" />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <CreditsPill />
            <UserMenu />
          </div>
        </div>
      </header>

      {children}

      {/* Bottom tab bar (phones + tablets) */}
      <nav
        aria-label="Studio"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0a0a12]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.filter((n) => n.mobile).map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "rp-focus relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
                    active ? "text-white" : "text-white/45 active:text-white/80"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="app-tab-indicator"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-[#6d5dfc] to-[#6aa7ff]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
