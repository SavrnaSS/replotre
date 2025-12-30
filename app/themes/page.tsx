"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import AuthWall from "../components/AuthWall";
import useAuth from "../hooks/useAuth";
import ThemeCard from "../components/ThemeCard";
import { Search, Sparkles, Filter, Check, ArrowRight, User } from "lucide-react";
import { getArtThemes } from "../config/artThemes";

function UserAvatar({ name }: { name?: string | null }) {
  const letter = name?.[0]?.toUpperCase() || "U";

  return (
    <button
      onClick={() => (window.location.href = "/profile")}
      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white bg-[#1A1A1C] border border-white/20 hover:bg-[#222226] transition-all cursor-pointer shrink-0"
      aria-label="Open profile"
      type="button"
      title="Profile"
    >
      {letter || <User size={16} />}
    </button>
  );
}

function clampTag(tag?: string) {
  if (!tag) return "";
  return String(tag).trim().slice(0, 32);
}

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

export default function ThemesPage() {
  const { user } = useAuth();

  const [themes, setThemes] = useState<any[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);

  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [copiedThemeId, setCopiedThemeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [isSticky, setIsSticky] = useState(false);
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);

  const [activeTag, setActiveTag] = useState<string>("All");

  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<number | null>(null);

  // ✅ Load themes safely (handles sync OR async getArtThemes)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const maybe = (getArtThemes as any)?.();
        const list = await Promise.resolve(maybe);
        if (!mounted) return;
        setThemes(Array.isArray(list) ? list : []);
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
    };
  }, []);

  // ✅ Smooth scroll handling (rAF throttled to reduce jank on mobile)
  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;

    const onScroll = () => {
      const currentY = window.scrollY;

      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setIsSticky(currentY > 40);

          if (currentY > lastY && currentY > 20) {
            setIsHeaderShrunk(true);
          } else if (currentY < lastY) {
            setIsHeaderShrunk(false);
          }

          lastY = currentY;
          ticking = false;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Restore selected theme highlight
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("mitux_selected_theme");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.id) setSelectedThemeId(parsed.id);
    } catch {}
  }, []);

  const tags = useMemo(() => {
    const s = new Set<string>();
    for (const t of themes as any[]) {
      const tag = clampTag(t?.tag);
      if (tag) s.add(tag);
    }
    const list = Array.from(s).sort((a, b) => a.localeCompare(b));
    return ["All", ...list].slice(0, 12);
  }, [themes]);

  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (themes as any[]).filter((theme) => {
      const labelOk = (theme?.label || "").toLowerCase().includes(q);
      const tagConfirm = clampTag(theme?.tag);
      const tagOk = activeTag === "All" ? true : tagConfirm === activeTag;
      return labelOk && tagOk;
    });
  }, [themes, searchQuery, activeTag]);

  const selectedTheme = useMemo(() => {
    if (!selectedThemeId) return null;
    return (themes as any[]).find((t) => t.id === selectedThemeId) || null;
  }, [themes, selectedThemeId]);

  const handleThemeClick = useCallback((theme: any) => {
    setSelectedThemeId(theme.id);
    setCopiedThemeId(theme.id);

    if (typeof window !== "undefined") {
      try {
        const rawImg = theme.imageUrls?.[0] || "";
        const encoded =
          rawImg && !rawImg.startsWith("data:")
            ? encodeURI(rawImg.startsWith("/") ? absoluteUrl(rawImg) : rawImg)
            : rawImg;

        window.localStorage.setItem(
          "mitux_selected_theme",
          JSON.stringify({ id: theme.id, imageUrl: encoded })
        );
      } catch {}
    }

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(theme.label).catch(() => {});
    }

    setShowToast(true);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setShowToast(false), 1900);

    window.setTimeout(() => {
      setCopiedThemeId((c) => (c === theme.id ? null : c));
    }, 1500);
  }, []);

  return (
    <AuthWall>
      <div className="relative min-h-screen bg-[#0D0D0F] text-white pb-24 overflow-x-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04]" />
        <div className="absolute -top-32 left-1/2 h-[420px] w-[980px] -translate-x-1/2 rounded-full bg-indigo-500/16 blur-[140px]" />
        <div className="absolute -bottom-36 right-[-140px] h-[520px] w-[520px] rounded-full bg-purple-600/14 blur-[140px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-black/50" />

        <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6">
          {/* Header */}
          <header
            className={[
              "flex flex-col min-[460px]:flex-row items-start min-[460px]:items-center justify-between gap-3 transition-all duration-300",
              isHeaderShrunk ? "pt-3 pb-4" : "pt-6 sm:pt-8 pb-7 sm:pb-10",
            ].join(" ")}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/workspace"
                  className={[
                    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 hover:bg-black/70 hover:border-white/30 transition-all duration-300",
                    isHeaderShrunk ? "px-3 py-1 text-[10px]" : "px-3.5 py-2 text-[11px] sm:text-xs",
                  ].join(" ")}
                >
                  <span>Back</span>
                </Link>

                <Link
                  href="/workspace"
                  className={[
                    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300",
                    isHeaderShrunk ? "px-3 py-1 text-[10px]" : "px-3.5 py-2 text-[11px] sm:text-xs",
                  ].join(" ")}
                >
                  <span className="truncate max-w-[140px] sm:max-w-none">
                    Go to Workspace
                  </span>
                  <ArrowRight size={14} />
                </Link>

                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70 max-w-full">
                  <Sparkles size={14} />
                  <span className="truncate">
                    {themesLoading ? "Loading…" : `${filteredThemes.length} themes`}
                  </span>
                </span>
              </div>

              <div className="mt-3 sm:mt-4 min-w-0">
                <h1
                  className={[
                    "font-semibold leading-tight transition-all duration-300 break-words",
                    isHeaderShrunk ? "text-base sm:text-lg" : "text-xl sm:text-4xl",
                  ].join(" ")}
                >
                  Browse AI Art Themes
                </h1>
                <p
                  className={[
                    "text-white/60 leading-snug transition-all duration-300 mt-2 break-words",
                    isHeaderShrunk ? "text-[10px] sm:text-xs" : "text-[12px] sm:text-sm",
                  ].join(" ")}
                >
                  Pick any look you like — Gerox will remember your choice for the next swap.
                </p>
              </div>
            </div>

            <div
              className={[
                isHeaderShrunk ? "scale-90" : "scale-100",
                "transition-all duration-300 self-start min-[460px]:self-auto",
              ].join(" ")}
            >
              {user && <UserAvatar name={user.name || user.email} />}
            </div>
          </header>

          {/* Main Card */}
          <section className="rounded-[26px] border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.35)] overflow-hidden">
            {/* Top strip */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-white/10">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-lg font-semibold tracking-wide flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400/80 shrink-0" />
                    <span className="truncate">Trending AI Art Themes</span>
                  </h2>
                  <p className="text-[11px] sm:text-sm text-white/50 mt-1 leading-snug break-words">
                    Tap a style to save it instantly. We also copy the theme name to your clipboard.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-white/60 shrink-0">
                  <Filter size={14} />
                  Filters
                </div>
              </div>

              {/* Sticky Search + Tags */}
              <div className="mt-4 relative">
                <div className={["sticky top-3 z-10", isSticky ? "pb-3" : "pb-2"].join(" ")}>
                  <div
                    className={[
                      "rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl",
                      "shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
                      isSticky ? "ring-1 ring-white/10" : "",
                    ].join(" ")}
                  >
                    <div className="p-3 sm:p-4">
                      {/* Search */}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45">
                          <Search size={16} />
                        </span>
                        <input
                          type="text"
                          placeholder="Search themes..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          inputMode="search"
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-black/30 text-[13px] sm:text-base text-white placeholder-white/35 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                        />
                      </div>

                      {/* Tag chips
                          ✅ Mobile (<460): wrap instead of horizontal scroll for smoother swipe/scroll
                      */}
                      <div
                        className={[
                          "mt-3 flex items-center gap-2 pb-1",
                          "flex-wrap",
                          "min-[460px]:flex-nowrap min-[460px]:overflow-x-auto min-[460px]:no-scrollbar",
                        ].join(" ")}
                      >
                        {tags.map((t) => {
                          const active = t === activeTag;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setActiveTag(t)}
                              className={[
                                "shrink-0 px-3 py-1.5 rounded-full text-[11px] border transition max-w-full",
                                active
                                  ? "bg-white text-black border-transparent"
                                  : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10",
                              ].join(" ")}
                              title={t}
                            >
                              <span className="truncate max-w-[180px] inline-block align-bottom">
                                {t}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              {themesLoading ? (
                <div className="py-10 text-center text-sm text-white/55">Loading themes…</div>
              ) : filteredThemes.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                    <Sparkles size={14} />
                    No matches
                  </div>
                  <p className="text-white/45 text-sm mt-4">No themes found for your search.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveTag("All");
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredThemes.map((theme: any, index: number) => (
                    <div
                      key={theme.id}
                      style={{ animationDelay: `${index * 45}ms` }}
                      className={[
                        "relative opacity-0 scale-95 animate-fadeInCard",
                        "transition-transform duration-300",
                        "will-change-transform",
                        "themeCardHover",
                      ].join(" ")}
                    >
                      <div className="absolute inset-0 rounded-xl pointer-events-none opacity-0 themeCardHoverOverlay transition duration-300 bg-gradient-to-tr from-white/10 to-transparent" />

                      <ThemeCard
                        theme={theme}
                        isActive={selectedThemeId === theme.id}
                        isCopied={copiedThemeId === theme.id}
                        onSelect={handleThemeClick}
                        // ThemeCard already handles its own text; this wrapper fixes layout + hover perf.
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="mt-5 sm:mt-6 text-center text-[11px] sm:text-xs text-white/45 px-1 sm:px-0 leading-snug">
            Tip: after selecting a theme, open{" "}
            <Link href="/workspace" className="text-white/70 font-semibold hover:text-white transition">
              Workspace
            </Link>{" "}
            and upload a centered face photo for best results.
          </div>
        </main>

        {/* Bottom-right toast (animated) */}
        <div
          className={[
            "fixed bottom-5 right-1/2 translate-x-1/2 min-[460px]:right-5 min-[460px]:translate-x-0 z-50 w-[92%] max-w-sm transition-all duration-300",
            showToast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 pointer-events-none",
          ].join(" ")}
          aria-live="polite"
        >
          <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl px-4 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 shrink-0">
                <Check size={18} className="text-emerald-200" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold truncate">{selectedTheme?.label || "Theme saved"}</p>
                <p className="text-[12px] text-white/55 truncate">Saved — Workspace will use this theme</p>
              </div>
            </div>
          </div>
        </div>

        {/* global css helpers */}
        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes fadeInCard {
            0% {
              opacity: 0;
              transform: translateY(10px) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translateY(0px) scale(1);
            }
          }
          .animate-fadeInCard {
            animation: fadeInCard 420ms ease forwards;
          }

          /* ✅ Hover effects only on devices that actually hover (prevents mobile swipe lag) */
          @media (hover: hover) and (pointer: fine) {
            .themeCardHover:hover {
              transform: translateY(-2px) scale(1.02);
            }
            .themeCardHover:hover .themeCardHoverOverlay {
              opacity: 1;
            }
          }

          /* ✅ Reduce motion if user prefers */
          @media (prefers-reduced-motion: reduce) {
            .animate-fadeInCard {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
            .themeCardHover {
              transition: none !important;
            }
          }
        `}</style>
      </div>
    </AuthWall>
  );
}
