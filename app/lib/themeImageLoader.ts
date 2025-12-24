// app/lib/themeImageLoader.ts
//
// ✅ Next.js (Turbopack) safe: no `require.context`, no `__WebpackModuleApi`.
// Instead, we read theme image URLs from your canonical theme source.
//
// NOTE: Your build error indicates `artThemes` is NOT exported and you should use `getArtThemes`.

import { getArtThemes } from "@/app/config/artThemes";

type Theme = {
  id: number;
  label: string;
  folder?: string;
  tag?: string;
  imageUrls: string[];
};

function safeThemes(): Theme[] {
  try {
    const t = getArtThemes?.();
    return Array.isArray(t) ? (t as Theme[]) : [];
  } catch {
    return [];
  }
}

function toPublicUrlMaybe(p: string) {
  if (!p) return "";
  // Keep absolute/data URLs as-is
  if (
    p.startsWith("data:") ||
    p.startsWith("http://") ||
    p.startsWith("https://") ||
    p.startsWith("file://")
  ) {
    return p;
  }
  // Ensure leading slash for public paths
  return p.startsWith("/") ? p : `/${p}`;
}

/**
 * Returns ALL images for a given theme id.
 * This is what the rest of the app should use instead of bundler-specific imports.
 */
export function getThemeImages(id: number): string[] {
  const themes = safeThemes();
  const theme = themes.find((t) => Number(t?.id) === Number(id));
  const urls = Array.isArray(theme?.imageUrls) ? theme!.imageUrls : [];
  return urls.map((u) => toPublicUrlMaybe(String(u))).filter(Boolean);
}

/**
 * Optional helper: get a random image for a theme id.
 */
export function getRandomThemeImage(id: number): string | null {
  const imgs = getThemeImages(id);
  if (!imgs.length) return null;
  return imgs[Math.floor(Math.random() * imgs.length)];
}

/**
 * Optional helper: precomputed map for quick lookup (safe at module load).
 */
export const themeImages: Record<number, string[]> = (() => {
  const out: Record<number, string[]> = {};
  for (const t of safeThemes()) {
    const tid = Number(t?.id);
    if (!Number.isFinite(tid)) continue;
    out[tid] = (Array.isArray(t.imageUrls) ? t.imageUrls : [])
      .map((u) => toPublicUrlMaybe(String(u)))
      .filter(Boolean);
  }
  return out;
})();
