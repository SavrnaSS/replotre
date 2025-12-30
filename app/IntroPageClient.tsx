// app/(wherever)/IntroPageClient.tsx  (or your current file path)
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  Sparkles,
  ArrowRight,
  Lock,
  X,
  CreditCard,
  ShieldCheck,
  Upload,
  Wand2,
  Download,
} from "lucide-react";

import CreditsBar from "@/app/components/CreditsBar";
import ProfileAvatar from "@/app/components/ProfileAvatar";

type Theme = {
  id: number;
  label: string;
  tag?: string;
  folder?: string;
  imageUrls: string[];
};

type Pack = {
  c: number; // credits
  p: number; // price
  badge?: string;
  desc?: string;
};

function absoluteUrl(path: string) {
  if (!path) return "";
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("file://")
  ) {
    return path;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

function formatUSD(n: number) {
  try {
    return new Intl.NumberFormat("en-IN").format(n);
  } catch {
    return String(n);
  }
}

function getDefaultPack(packs: Pack[]) {
  const popular = packs.find((x) =>
    (x.badge || "").toLowerCase().includes("popular")
  );
  return popular ?? packs[Math.min(1, packs.length - 1)] ?? packs[0];
}

function safeSetSelectedPack(pack: Pack) {
  try {
    localStorage.setItem(
      "mitux_selected_pack",
      JSON.stringify({ c: pack.c, p: pack.p })
    );
  } catch {}
}

function safeGetSelectedPack(): { c?: number; p?: number } | null {
  try {
    const raw = localStorage.getItem("mitux_selected_pack");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------
   Fancy loader bits (shimmer + spinner)
------------------------------------------- */
function SpinnerSparkle() {
  return (
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border border-white/15" />
      <div className="absolute inset-0 rounded-full loader-ring" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-white/75" />
      </div>
    </div>
  );
}

function ThemeCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30">
      <div className="aspect-[4/3] w-full skeleton" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <div className="h-4 w-3/4 rounded-lg skeleton" />
        <div className="mt-2 h-3 w-1/2 rounded-lg skeleton" />
      </div>
    </div>
  );
}

function TrendingLoader() {
  return (
    <div className="py-8">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <SpinnerSparkle />
        <div>
          <p className="text-sm font-semibold text-white/85">
            Loading trending themes
          </p>
          <p className="text-xs text-white/55 mt-0.5">
            Preparing previews for the best experience…
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ThemeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function PaywallModal({
  open,
  onClose,
  onContinue,
  packs,
  selectedCredits,
  setSelectedCredits,
  isAuthed,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  packs: Pack[];
  selectedCredits: number | null;
  setSelectedCredits: (c: number) => void;
  isAuthed: boolean;
  onLogin: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const selectedPack = packs.find((p) => p.c === selectedCredits) ?? null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3 sm:p-6">
        <div
          className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#0b0b10]/90 shadow-[0_40px_140px_rgba(0,0,0,0.65)] overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/10">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                Upgrade
              </p>
              <h3 className="text-lg sm:text-xl font-semibold truncate">
                Buy credits
              </h3>
              <p className="text-xs text-white/55 mt-0.5">
                Credits are used for generation and re-generation.
              </p>
            </div>

            <button
              onClick={onClose}
              className="shrink-0 h-10 w-10 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition flex items-center justify-center"
              aria-label="Close"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[78vh] sm:max-h-[70vh] overflow-y-auto overscroll-contain touch-pan-y">
            <div className="px-5 sm:px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-xs text-white/70">
                  <ShieldCheck size={16} className="text-white/70" />
                  Secure billing · Pay once, use anytime
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-white/60">
                  <CreditCard size={16} />
                  USD ($)
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {packs.map((pack) => {
                  const active = pack.c === selectedCredits;

                  return (
                    <div
                      key={pack.c}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedCredits(pack.c);
                        safeSetSelectedPack(pack);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCredits(pack.c);
                          safeSetSelectedPack(pack);
                        }
                      }}
                      className={[
                        "relative rounded-[26px] border bg-black/25 p-5 cursor-pointer transition",
                        "focus:outline-none focus:ring-2 focus:ring-purple-500/40",
                        active
                          ? "border-purple-400/60 ring-2 ring-purple-500/30"
                          : "border-white/10 hover:border-white/20",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {pack.badge ? (
                            <span
                              className={[
                                "text-[11px] px-2.5 py-1 rounded-full border",
                                active
                                  ? "bg-purple-500/20 border-purple-400/30 text-purple-100"
                                  : "bg-white/5 border-white/10 text-white/70",
                              ].join(" ")}
                            >
                              {pack.badge}
                            </span>
                          ) : (
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                              Pack
                            </span>
                          )}

                          {active && (
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-200">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                          <CreditCard size={18} className="text-white/70" />
                        </div>
                      </div>

                      <div className="mt-5">
                        <p className="text-5xl font-bold leading-none">
                          {pack.c}
                        </p>
                        <p className="text-white/70 mt-2">Credits</p>

                        <p className="mt-6 text-2xl font-semibold">
                        ${formatUSD(pack.p)}
                        </p>

                        <p className="text-sm text-white/55 mt-2">
                          {pack.desc || "Instant top-up"}
                        </p>
                      </div>

                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCredits(pack.c);
                            safeSetSelectedPack(pack);
                          }}
                          className={[
                            "w-full py-3 rounded-2xl font-semibold transition border",
                            active
                              ? "bg-white text-black border-transparent hover:bg-gray-200"
                              : "bg-white/5 text-white border-white/10 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {active ? "Selected" : "Select pack"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60 leading-snug">
                <span className="text-white/85 font-semibold">Tip:</span> For
                the smoothest flow, continue to the{" "}
                <span className="text-white/90 underline underline-offset-4">
                  Billing
                </span>{" "}
                page where your balance & history update instantly.
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-black/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-white/55">
                Selected:{" "}
                <span className="text-white/85 font-semibold">
                  {selectedPack
                    ? `${selectedPack.c} credits (₹${formatUSD(selectedPack.p)})`
                    : "None"}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/85 font-semibold hover:bg-white/10 transition"
                  type="button"
                >
                  Not now
                </button>

                {isAuthed ? (
                  <button
                    onClick={onContinue}
                    className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                    type="button"
                  >
                    Continue to Billing
                  </button>
                ) : (
                  <button
                    onClick={onLogin}
                    className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
                    type="button"
                  >
                    Login to buy credits
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* styled-jsx for a smoother loader */}
      <style jsx>{`
        .loader-ring {
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-top-color: rgba(255, 255, 255, 0.8);
          animation: spin 0.9s linear infinite;
        }
        .skeleton {
          position: relative;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.16),
            transparent
          );
          animation: shimmer 1.2s ease-in-out infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

export default function IntroPageClient() {
  const router = useRouter();

  // ✅ THEMES: keep payload light to reduce lag (store only what we need on landing)
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);

  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const isLocked = authChecked && !authUser;
  const isAuthed = !!authUser;

  const [heroThemes, setHeroThemes] = useState<Theme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);

  const packs: Pack[] = useMemo(
    () => [
      { c: 2000, p: 19, badge: "Starter", desc: "Try it out" },
      { c: 5000, p: 39, badge: "Most popular", desc: "Best value" },
      { c: 12999, p: 79, badge: "Pro", desc: "For power users" },
    ],
    []
  );

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = safeGetSelectedPack();
    if (saved?.c) return saved.c;
    return getDefaultPack(packs)?.c ?? null;
  });

  // ✅ fetch themes with abort + minimal mapping for performance
  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;

    (async () => {
      setThemesLoading(true);
      try {
        const res = await fetch("/api/themes", {
          cache: "no-store",
          signal: ac.signal,
        });

        const data = await res.json().catch(() => ({}));
        if (!mounted) return;

        const raw = Array.isArray(data?.themes) ? data.themes : [];

        // keep only minimal fields + only first image to reduce memory & re-render cost
        const slim: Theme[] = raw
          .map((t: any) => ({
            id: Number(t?.id),
            label: String(t?.label || "Theme"),
            tag: t?.tag ? String(t.tag) : undefined,
            folder: t?.folder ? String(t.folder) : undefined,
            imageUrls: Array.isArray(t?.imageUrls) ? t.imageUrls.slice(0, 1) : [],
          }))
          .filter((t: Theme) => Number.isFinite(t.id) && t.imageUrls.length > 0);

        setThemes(slim);
      } catch {
        if (!mounted) return;
        setThemes([]);
      } finally {
        if (!mounted) return;
        setThemesLoading(false);
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  // auth (unchanged logic)
  useEffect(() => {
    const ac = new AbortController();
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/me", {
          cache: "no-store",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        setAuthUser(data?.user || null);
      } catch {
        if (!mounted) return;
        setAuthUser(null);
      } finally {
        if (!mounted) return;
        setAuthChecked(true);
      }
    })();

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  // restore selected theme + build hero themes (same behavior, now lightweight)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!themes.length) {
      setHeroThemes([]);
      return;
    }

    try {
      const saved = window.localStorage.getItem("mitux_selected_theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSelectedThemeId(parsed?.id ?? null);

        const selected = themes.find((t) => t.id === parsed.id);
        const others = themes
          .filter((t) => t.id !== parsed.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const next = [selected, ...others].filter(Boolean) as Theme[];
        setHeroThemes(next.length ? next : themes.slice(0, 4));
        return;
      }
    } catch {}

    const shuffled = [...themes].sort(() => Math.random() - 0.5);
    setHeroThemes(shuffled.slice(0, 4));
  }, [themes]);

  const selectedTheme = useMemo(() => {
    if (!selectedThemeId) return null;
    return themes.find((t) => t.id === selectedThemeId) || null;
  }, [selectedThemeId, themes]);

  const handleThemeSelect = (themeId: number) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;

    const raw =
      theme.imageUrls[Math.floor(Math.random() * theme.imageUrls.length)];
    const abs = encodeURI(raw);

    setSelectedThemeId(themeId);

    window.localStorage.setItem(
      "mitux_selected_theme",
      JSON.stringify({ id: themeId, imageUrl: abs })
    );
  };

  const start = () => router.push("/workspace");
  const goLogin = () => (window.location.href = "/login");

  const continueToBilling = () => {
    if (!isAuthed) {
      goLogin();
      return;
    }

    const pack =
      packs.find((p) => p.c === selectedCredits) ?? getDefaultPack(packs);
    if (pack) safeSetSelectedPack(pack);

    setPaywallOpen(false);

    const c = pack?.c ?? "";
    const p = pack?.p ?? "";
    window.location.href = `/billing?pack=${encodeURIComponent(
      String(c)
    )}&price=${encodeURIComponent(String(p))}`;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedCredits != null) return;
    const def = getDefaultPack(packs);
    if (def) {
      setSelectedCredits(def.c);
      safeSetSelectedPack(def);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packs]);

  return (
    <div className="relative min-h-screen bg-[#07070B] text-white overflow-hidden">
      {/* Ambient BG */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/40" />
      </div>

      {/* Top Nav */}
      <header className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            {/* Row 1 */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 shrink-0 rounded-2xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                  <Image
                    src="/logo.jpeg"
                    alt="Gerox"
                    width={44}
                    height={44}
                    priority
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold">Gerox</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">
                      beta
                    </span>
                  </div>
                  <p className="text-[12px] text-white/55 truncate">
                    Trending Ai Themes · Private photoshoot
                  </p>
                </div>
              </div>

              {/* Desktop actions */}
              <div className="hidden md:flex items-center gap-3">
                {isAuthed ? (
                  <>
                    <div className="hidden lg:block">
                      <CreditsBar />
                    </div>

                    <button
                      onClick={() => setPaywallOpen(true)}
                      className="px-4 py-2 rounded-2xl bg-white text-black font-semibold shadow hover:bg-gray-200 transition"
                      type="button"
                    >
                      Buy Credits
                    </button>

                    <ProfileAvatar />
                  </>
                ) : (
                  <button
                    onClick={goLogin}
                    className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
                    type="button"
                  >
                    Login
                  </button>
                )}
              </div>

              {/* Mobile top-right */}
              <div className="md:hidden shrink-0">
                {isAuthed ? (
                  <ProfileAvatar />
                ) : (
                  <button
                    onClick={goLogin}
                    className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 transition"
                    type="button"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Mobile actions */}
            <div className="md:hidden w-full">
              {isAuthed ? (
                <div className="grid grid-cols-1 gap-3">
                  <div className="w-full">
                    <CreditsBar />
                  </div>

                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="w-full py-3 rounded-2xl bg-white text-black font-semibold shadow hover:bg-gray-200 transition"
                    type="button"
                  >
                    Buy Credits
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3" />
              )}
            </div>
          </div>

          <div className="h-px bg-white/10" />
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 md:pt-14 pb-16">
        <div className="grid grid-cols-12 gap-8 items-stretch">
          {/* Left hero */}
          <section className="col-span-12 lg:col-span-7">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 sm:p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[12px] text-white/75">
                <Sparkles size={14} />
                Create studio‑grade visuals in seconds
              </div>

              <h1 className="mt-6 text-3xl sm:text-5xl font-semibold leading-[1.1]">
                Make your face fit any{" "}
                <span className="bg-gradient-to-r from-purple-300 via-indigo-200 to-white bg-clip-text text-transparent">
                  trending AI art
                </span>{" "}
                style.
              </h1>

              <p className="mt-4 text-[14px] sm:text-[16px] text-white/65 max-w-xl">
                Pick a theme, upload a photo, and generate a premium‑looking
                portrait. Your recent results stay saved — and you can
                re‑generate with one click.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4 text-[12px] text-white/70">
                {["Fast generation", "Saved history", "Download anytime"].map(
                  (txt) => (
                    <span key={txt} className="inline-flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                        <Check size={12} className="text-emerald-300" />
                      </span>
                      {txt}
                    </span>
                  )
                )}
              </div>

              <div className="mt-7">
                <button
                  onClick={start}
                  className="w-full rounded-2xl bg-white text-black font-semibold py-4 text-base shadow hover:bg-gray-200 transition flex items-center justify-center gap-2"
                  type="button"
                >
                  Start Image generation <ArrowRight size={18} />
                </button>

                {isLocked && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-center gap-2 text-white/85">
                      <Lock size={16} />
                      <p className="text-sm font-semibold">
                        Login required to generate
                      </p>
                    </div>
                    <p className="text-[12px] text-white/60 mt-1 leading-snug">
                      You can browse themes now — generation & saving history
                      unlock after login.
                    </p>
                    <button
                      onClick={goLogin}
                      className="mt-3 w-full py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                      type="button"
                    >
                      Login to unlock
                    </button>
                  </div>
                )}

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-white/55">
                  <Link
                    href="/themes"
                    className="hover:text-white/80 transition"
                  >
                    Browse full library →
                  </Link>
                  <span className="text-white/45">Tip: use centered face photo</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right theme cards */}
          <section className="col-span-12 lg:col-span-5">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-5 sm:p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold">Trending picks</p>
                  <p className="text-[12px] text-white/55 mt-0.5">
                    Select a theme — Workspace will use it
                  </p>
                </div>

                <Link
                  href="/themes"
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/15 text-[12px] text-white/85 hover:bg-white/10 transition"
                >
                  Browse ↗
                </Link>
              </div>

              {themesLoading ? (
                <TrendingLoader />
              ) : heroThemes.length === 0 ? (
                <div className="py-10 text-center text-sm text-white/55">
                  No themes available.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {heroThemes.map((t, idx) => {
                    const active = selectedThemeId === t.id;
                    const img = t.imageUrls?.[0]
                      ? encodeURI(t.imageUrls[0])
                      : "";

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleThemeSelect(t.id)}
                        className={[
                          "relative overflow-hidden rounded-3xl border bg-black/30 transition group text-left",
                          "will-change-transform",
                          active
                            ? "border-purple-400/60 ring-2 ring-purple-500/40"
                            : "border-white/10 hover:border-white/20",
                        ].join(" ")}
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden">
                          {/* Next/Image = much smoother on production */}
                          <Image
                            src={img}
                            alt={t.label}
                            width={640}
                            height={480}
                            sizes="(max-width: 1024px) 50vw, 25vw"
                            priority={idx < 2} // first 2 load quickly; rest lazy
                            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                        {active && (
                          <div className="absolute top-3 left-3 h-8 w-8 rounded-full bg-purple-500/90 text-white flex items-center justify-center shadow">
                            <Check size={16} />
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                          <p className="text-sm font-semibold leading-tight">
                            {t.label}
                          </p>
                          <p className="text-[12px] text-white/60 mt-0.5">
                            {t.tag || "Portrait imagination"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-[12px] text-white/60">
                <span className="text-white/80 font-semibold">Pro tip:</span>{" "}
                choose a theme here, then in Workspace upload a centered face
                photo for best results.
              </div>
            </div>
          </section>
        </div>

        {/* How it works */}
        <section className="mt-8 sm:mt-10">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.35)] overflow-hidden">
            <div className="px-5 sm:px-8 py-6 sm:py-7 border-b border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                    Private photoshoot flow
                  </p>
                  <h2 className="mt-2 text-xl sm:text-2xl font-semibold">
                    Generate a private photoshoot in 3 steps
                  </h2>
                  <p className="mt-2 text-sm text-white/60 max-w-2xl">
                    fast, simple, and repeatable. Your theme selection carries
                    into Workspace.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10">
                    <ShieldCheck size={14} />
                    Private by default
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10">
                    <Download size={14} />
                    Download anytime
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-8 py-6 sm:py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                <div className="rounded-3xl border border-white/10 bg-black/25 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                      Step 1
                    </span>
                    <span className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Sparkles size={18} className="text-white/80" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">Choose a theme</h3>
                  <p className="mt-2 text-sm text-white/60 leading-snug">
                    Browse trending styles and select one. We’ll remember it for
                    Workspace so you don’t repeat steps.
                  </p>

                  <div className="mt-4 text-xs text-white/55">
                    <span className="text-white/80 font-semibold">Tip:</span>{" "}
                    Pick “cinematic / studio” themes for HD‑looking results.
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                      Step 2
                    </span>
                    <span className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Upload size={18} className="text-white/80" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    Upload a centered face photo
                  </h3>
                  <p className="mt-2 text-sm text-white/60 leading-snug">
                    Use a front‑facing image with good lighting. Avoid heavy
                    blur, sunglasses, or extreme angles.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/55">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      ✅ Good lighting
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      ✅ Centered face
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      ❌ Side angles
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      ❌ Sunglasses
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/25 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                      Step 3
                    </span>
                    <span className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Wand2 size={18} className="text-white/80" />
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">
                    Generate & re‑generate
                  </h3>
                  <p className="mt-2 text-sm text-white/60 leading-snug">
                    Create results, then tweak and re‑generate until it’s
                    perfect. Download anytime and keep your favorites.
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                    <span className="text-white/80 font-semibold">
                      Pro workflow:
                    </span>{" "}
                    Generate 3–5 times → pick best → download.
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-white/55">
                  <span className="text-white/75 font-semibold">Privacy:</span>{" "}
                  Don’t upload private documents; use face photos only.
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/themes"
                    className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/85 font-semibold hover:bg-white/10 transition text-center"
                  >
                    Explore themes
                  </Link>

                  <button
                    onClick={start}
                    className="px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                    type="button"
                  >
                    Open Workspace <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Paywall */}
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onContinue={continueToBilling}
        packs={packs}
        selectedCredits={selectedCredits}
        setSelectedCredits={(c) => setSelectedCredits(c)}
        isAuthed={isAuthed}
        onLogin={goLogin}
      />

      {/* loader css (shared) */}
      <style jsx>{`
        .loader-ring {
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-top-color: rgba(255, 255, 255, 0.8);
          animation: spin 0.9s linear infinite;
        }
        .skeleton {
          position: relative;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.16),
            transparent
          );
          animation: shimmer 1.2s ease-in-out infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
