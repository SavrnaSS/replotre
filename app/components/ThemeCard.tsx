"use client";

import { useEffect, useMemo, useState } from "react";

type Theme = {
  id: number;
  label: string;
  folder?: string;
  tag?: string;
  imageUrls: string[];
};

export default function ThemeCard({
  theme,
  isActive,
  isCopied,
  onSelect,
}: {
  theme: Theme;
  isActive: boolean;
  isCopied: boolean;
  onSelect: (theme: Theme) => void;
}) {
  const [liked, setLiked] = useState(false);

  // Like restore
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = JSON.parse(
        window.localStorage.getItem("mitux_liked_themes") || "[]"
      );
      const arr = Array.isArray(stored) ? stored : [];
      const key = theme?.folder || String(theme?.id);
      setLiked(arr.includes(key));
    } catch {
      setLiked(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme?.folder, theme?.id]);

  const toggleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (typeof window === "undefined") return;

    try {
      const stored = JSON.parse(
        window.localStorage.getItem("mitux_liked_themes") || "[]"
      );
      const arr = Array.isArray(stored) ? stored : [];
      const key = theme?.folder || String(theme?.id);

      let updated: string[];
      if (arr.includes(key)) {
        updated = arr.filter((id: string) => id !== key);
        setLiked(false);
      } else {
        updated = [...arr, key];
        setLiked(true);
      }

      window.localStorage.setItem("mitux_liked_themes", JSON.stringify(updated));
    } catch {}
  };

  const subtitle = useMemo(() => {
    const l = (theme.label || "").toLowerCase();
    if (l.includes("hoodie")) return "Hoodie imagination";
    if (l.includes("mountain")) return "Mountain imagination";
    if (l.includes("bike")) return "Photoshoot imagination";
    if (l.includes("portrait")) return "Portrait imagination";
    return "Creative imagination";
  }, [theme.label]);

  const QUALITY_COST = { SD: 1, HD: 2 };

  const recommendedQuality = useMemo(() => {
    const l = (theme.label || "").toLowerCase();
    if (l.includes("cinematic")) return "HD";
    if (l.includes("studio")) return "HD";
    return "SD";
  }, [theme.label]);

  const likes = useMemo(() => (theme.id * 137) % 12000 + 800, [theme.id]);

  const img = theme.imageUrls?.[0] || "";

  return (
    <div
      onClick={() => onSelect(theme)}
      className={[
        "relative overflow-hidden rounded-2xl cursor-pointer bg-[#0f0f12] border border-white/10",
        "transition-all duration-300 group",
        isActive ? "ring-2 ring-purple-500/60 scale-[1.02]" : "",
      ].join(" ")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(theme);
        }
      }}
    >
      {/* IMAGE */}
      <img
        src={img}
        alt={theme.label}
        className="w-full h-[320px] object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* LIKE BUTTON */}
      <button
        onClick={toggleLike}
        className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all hover:scale-110"
        type="button"
        aria-label={liked ? "Unfavorite theme" : "Favorite theme"}
      >
        <span className={liked ? "text-red-500" : "text-white/70"}>
          {liked ? "♥" : "♡"}
        </span>
      </button>

      {/* SELECTED BADGE */}
      {isActive && (
        <div className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm shadow-lg">
          ✓
        </div>
      )}

      {/* GRADIENT OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* CONTENT */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <h3 className="text-sm font-semibold text-white leading-tight">
          {theme.label}
        </h3>

        <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>

        {/* QUALITY + CREDIT COST */}
        <div className="mt-2 flex items-center gap-2 text-[11px] flex-wrap">
          <span
            className={[
              "px-2 py-0.5 rounded-md border",
              recommendedQuality === "SD"
                ? "bg-purple-500/15 border-purple-400/40 text-purple-300"
                : "bg-white/5 border-white/10 text-white/55",
            ].join(" ")}
          >
            SD · {QUALITY_COST.SD} credit
          </span>

          <span
            className={[
              "px-2 py-0.5 rounded-md border",
              recommendedQuality === "HD"
                ? "bg-purple-500/15 border-purple-400/40 text-purple-300"
                : "bg-white/5 border-white/10 text-white/55",
            ].join(" ")}
          >
            HD · {QUALITY_COST.HD} credits
          </span>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span className="text-[11px] text-white/50">
            🔥 {likes.toLocaleString()} likes
          </span>

          <span className="text-[11px] px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition">
            Try →
          </span>
        </div>

        {/* COPIED FEEDBACK */}
        {isCopied && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur text-xs font-medium text-white">
            Theme Selected ✓
          </div>
        )}
      </div>
    </div>
  );
}
