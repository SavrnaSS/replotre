// lib/theme/themeAutoLoader.ts
import { slugify } from "./slugify";

/* -----------------------------
   Helpers
----------------------------- */

/** Human-friendly label */
const toLabel = (str: string) =>
  String(str || "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Optional aesthetic tag */
const toTag = (labelOrSlug: string) => {
  const cleaned = labelOrSlug
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();

  // Pick the core subject word
  if (cleaned.includes("hoodie")) return "Hoodie Imagination";
  if (cleaned.includes("portrait")) return "Portrait Imagination";
  if (cleaned.includes("street")) return "Street Imagination";
  if (cleaned.includes("cinematic")) return "Cinematic Imagination";
  if (cleaned.includes("studio")) return "Studio Imagination";
  if (cleaned.includes("anime")) return "Anime Imagination";
  if (cleaned.includes("fashion")) return "Fashion Imagination";

  // Safe, UI-friendly fallback
  const firstWord =
    cleaned.split(" ").find(w => w.length > 2) ?? "Creative";

  return `${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)} Imagination`;
};

/* -----------------------------
   Types
----------------------------- */

type ThemeBucket = {
  slug: string;          // backend-safe
  rawFolder: string;     // REAL folder on disk
  files: string[];       // sub-paths
};

/* -----------------------------
   Auto Loader
----------------------------- */

export const loadAllThemes = () => {
  /**
   * Scans /public/themes recursively
   * Webpack statically analyzes this
   */
  const ctx = require.context(
    "../../public/themes",
    true,
    /\.(png|jpe?g|webp|gif)$/i
  );

  const map: Record<string, ThemeBucket> = {};

  ctx.keys().forEach((key: string) => {
    // "./Cinematic Portrait/men/black/01.jpg"
    const cleaned = key.replace(/^\.\//, "");
    const parts = cleaned.split("/");

    const rawFolder = parts[0];
    const slug = slugify(rawFolder);
    const subPath = parts.slice(1).join("/");

    if (!map[slug]) {
      map[slug] = {
        slug,
        rawFolder,
        files: [],
      };
    }

    map[slug].files.push(subPath);
  });

  /* -----------------------------
     Final Theme Objects
  ----------------------------- */

  let id = 1;

  return Object.values(map).map((t) => ({
    id: id++,

    /** Backend identifier */
    folder: t.slug,

    /** UI display */
    label: toLabel(t.rawFolder),

    /** Optional UI tag */
    tag: toTag(t.slug),

    /** ✅ REAL PUBLIC PATH (NO 404 EVER) */
    imageUrls: t.files.map(
      (file) => `/themes/${t.rawFolder}/${file}`
    ),
  }));
};

/* -----------------------------
   Lookup Helper
----------------------------- */

export const getThemeByName = (name: string, themes: any[]) => {
  if (!name) return null;
  const slug = slugify(name);
  return (
    themes.find((t) => t.folder === slug) ||
    themes.find((t) => t.folder === name)
  );
};
