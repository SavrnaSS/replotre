// ./app/components/ThemePicker.tsx
"use client";

import { useMemo, useState } from "react";
import { getArtThemes } from "@/app/config/artThemes";

type Theme = {
  id: number;
  label: string;
  imageUrls: string[];
  folder?: string;
  tag?: string;
};

function absoluteUrl(path: string) {
  if (!path) return "";

  const p = String(path);

  // already absolute / data URLs
  if (
    p.startsWith("data:") ||
    p.startsWith("http://") ||
    p.startsWith("https://") ||
    p.startsWith("file://")
  ) {
    return p;
  }

  // SSR safe
  if (typeof window === "undefined") return p;

  // ensure leading slash
  if (p.startsWith("/")) return `${window.location.origin}${p}`;
  return `${window.location.origin}/${p}`;
}

type Props = {
  target: any;
  setTarget: (next: any) => void;

  // ✅ OPTIONAL (FaceSwapUI can pass themes + controlled selection)
  artThemes?: Theme[];
  selectedThemeId?: number | null;
  setSelectedThemeId?: (id: number) => void;
};

export default function ThemePicker({
  target,
  setTarget,
  artThemes,
  selectedThemeId,
  setSelectedThemeId,
}: Props) {
  const themes: Theme[] = useMemo(() => {
    // If parent passed themes, use them
    if (Array.isArray(artThemes)) return artThemes;

    // Otherwise load from config (FIX: artThemes export doesn't exist; use getArtThemes)
    try {
      const fromFn = typeof getArtThemes === "function" ? getArtThemes() : [];
      return Array.isArray(fromFn) ? (fromFn as Theme[]) : [];
    } catch {
      return [];
    }
  }, [artThemes]);

  // ✅ If parent doesn't control selection, manage it locally
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(null);
  const currentSelectedId = selectedThemeId ?? localSelectedId;

  const setSelected = (id: number) => {
    if (setSelectedThemeId) setSelectedThemeId(id);
    else setLocalSelectedId(id);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
      {themes.map((t) => {
        const firstImg = absoluteUrl(t.imageUrls?.[0] || "");

        return (
          <div
            key={t.id}
            onClick={() => {
              setSelected(t.id);

              const imgs = Array.isArray(t.imageUrls) ? t.imageUrls : [];
              const randomImg =
                imgs[Math.floor(Math.random() * (imgs.length || 1))] || "";
              const preview = absoluteUrl(randomImg);

              setTarget({
                ...(target || {}),
                file: null,
                preview,
                themeId: t.id,
              });
            }}
            className={[
              "cursor-pointer rounded-xl overflow-hidden border transition",
              currentSelectedId === t.id
                ? "border-white/60"
                : "border-white/10 hover:border-white/25",
            ].join(" ")}
          >
            <img
              src={firstImg}
              className="w-full h-32 object-cover"
              alt={t.label}
              loading="lazy"
            />
            <p className="text-xs text-center py-2 bg-black/40">{t.label}</p>
          </div>
        );
      })}
    </div>
  );
}
