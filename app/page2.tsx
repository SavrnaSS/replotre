"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, ArrowRight, Lock } from "lucide-react";

import CreditsBar from "@/app/components/CreditsBar";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { artThemes } from "@/app/config/artThemes";

/**
 * Intro / Landing page
 * - Advanced hero UI + preview themes
 * - Stores selected theme into localStorage (mitux_selected_theme)
 * - CTA redirects to /workspace
 * - Keeps your existing theme-selection storage behavior
 */

type Theme = {
  id: number;
  label: string;
  tag?: string;
  folder?: string;
  imageUrls: string[];
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

export default function IntroPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const isLocked = authChecked && !authUser;

  const [heroThemes, setHeroThemes] = useState<Theme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);

  // ✅ Keep your existing "soft lock" rule: if /api/me returns no user => locked
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
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
    };
  }, []);

  useEffect(() => {
    // restore selected theme if already saved
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem("mitux_selected_theme");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSelectedThemeId(parsed?.id ?? null);

        const selected = (artThemes as Theme[]).find((t) => t.id === parsed.id);
        const others = (artThemes as Theme[])
          .filter((t) => t.id !== parsed.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const next = [selected, ...others].filter(Boolean) as Theme[];
        setHeroThemes(next);
        return;
      }
    } catch {}

    // fallback random
    const shuffled = [...(artThemes as Theme[])].sort(() => Math.random() - 0.5);
    setHeroThemes(shuffled.slice(0, 4));
  }, []);

  const selectedTheme = useMemo(() => {
    if (!selectedThemeId) return null;
    return (artThemes as Theme[]).find((t) => t.id === selectedThemeId) || null;
  }, [selectedThemeId]);

  const handleThemeSelect = (themeId: number) => {
    const theme = (artThemes as Theme[]).find((t) => t.id === themeId);
    if (!theme) return;

    // pick an image (your old behavior)
    const raw = theme.imageUrls[Math.floor(Math.random() * theme.imageUrls.length)];
    const abs = encodeURI(raw);

    setSelectedThemeId(themeId);

    // ✅ same key so Workspace can restore it exactly like before
    window.localStorage.setItem(
      "mitux_selected_theme",
      JSON.stringify({ id: themeId, imageUrl: abs })
    );
  };

  const start = () => {
    // Intro always navigates to workspace; workspace handles lock & generation
    router.push("/workspace");
  };

  const goLogin = () => (window.location.href = "/login");

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
      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-7">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl px-5 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
              <img src="/logo.jpeg" alt="Gerox" className="h-full w-full object-cover" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold">Gerox</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">
                  beta
                </span>
              </div>
              <p className="text-[12px] text-white/55">
              Trending Ai Themes · Private photoshoot
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <div className="px-3 py-2 rounded-2xl border border-white/10 bg-black/25 text-[12px] text-white/70">
              Mode{" "}
              <span className="ml-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/90 font-semibold">
                Themes
              </span>
            </div>

            <div className="px-3 py-2 rounded-2xl border border-white/10 bg-black/25 text-[12px] text-white/70 min-w-[260px] truncate">
              Theme{" "}
              <span className="ml-2 text-white/90 font-semibold">
                {selectedTheme?.label || "Pick a theme"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden xl:block">
                <CreditsBar />
              </div>

              <button
                onClick={() => alert("Hook your paywall here")}
                className="px-4 py-2 rounded-2xl bg-white text-black font-semibold shadow hover:bg-gray-200 transition"
              >
                Buy Credits
              </button>

              <ProfileAvatar />
            </div>
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <Link
              href="/themes"
              className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-[12px] text-white/80 hover:bg-white/10 transition"
            >
              Themes
            </Link>
            <button
              onClick={() => (isLocked ? goLogin() : start())}
              className="px-4 py-2 rounded-2xl bg-white text-black font-semibold hover:bg-gray-200 transition"
            >
              Start
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-16">
        <div className="grid grid-cols-12 gap-8 items-stretch">
          {/* Left hero */}
          <section className="col-span-12 lg:col-span-7">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[12px] text-white/75">
                <Sparkles size={14} />
                Create studio‑grade visuals in seconds
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl font-semibold leading-[1.08]">
                Make your face fit any{" "}
                <span className="bg-gradient-to-r from-purple-300 via-indigo-200 to-white bg-clip-text text-transparent">
                  trending AI art
                </span>{" "}
                style.
              </h1>

              <p className="mt-4 text-[15px] sm:text-[16px] text-white/65 max-w-xl">
                Pick a theme, upload a photo, and generate a premium‑looking portrait.
                Your recent results stay saved — and you can re‑generate with one click.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-[12px] text-white/70">
                <span className="inline-flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                    <Check size={12} className="text-emerald-300" />
                  </span>
                  Fast generation
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                    <Check size={12} className="text-emerald-300" />
                  </span>
                  Saved history
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center">
                    <Check size={12} className="text-emerald-300" />
                  </span>
                  Download anytime
                </span>
              </div>

              {/* CTA */}
              <div className="mt-7">
                <button
                  onClick={start}
                  className="w-full rounded-2xl bg-white text-black font-semibold py-4 text-base shadow hover:bg-gray-200 transition flex items-center justify-center gap-2"
                >
                  Start Image generation <ArrowRight size={18} />
                </button>

                {isLocked && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-center gap-2 text-white/85">
                      <Lock size={16} />
                      <p className="text-sm font-semibold">Login required to generate</p>
                    </div>
                    <p className="text-[12px] text-white/60 mt-1 leading-snug">
                      You can browse themes now — generation & saving history unlock after login.
                    </p>
                    <button
                      onClick={goLogin}
                      className="mt-3 w-full py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                    >
                      Login to unlock
                    </button>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-[12px] text-white/55">
                  <Link href="/themes" className="hover:text-white/80 transition">
                    Browse full library →
                  </Link>
                  <span className="text-white/45">Tip: use centered face photo</span>
                </div>
              </div>
            </div>
          </section>

          {/* Right theme cards */}
          <section className="col-span-12 lg:col-span-5">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
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
                  Browse full library ↗
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {heroThemes.map((t) => {
                  const active = selectedThemeId === t.id;
                  const img = t.imageUrls?.[0] ? encodeURI(t.imageUrls[0]) : "";

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleThemeSelect(t.id)}
                      className={[
                        "relative overflow-hidden rounded-3xl border bg-black/30 transition group text-left",
                        active
                          ? "border-purple-400/60 ring-2 ring-purple-500/40"
                          : "border-white/10 hover:border-white/20",
                      ].join(" ")}
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden">
                        <img
                          src={img}
                          alt={t.label}
                          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      {active && (
                        <div className="absolute top-3 left-3 h-8 w-8 rounded-full bg-purple-500/90 text-white flex items-center justify-center shadow">
                          <Check size={16} />
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-sm font-semibold leading-tight">{t.label}</p>
                        <p className="text-[12px] text-white/60 mt-0.5">
                          {t.tag || "Portrait imagination"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-[12px] text-white/60">
                <span className="text-white/80 font-semibold">Pro tip:</span>{" "}
                choose a theme here, then in Workspace upload a centered face photo for best results.
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
