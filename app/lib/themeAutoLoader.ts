// app/lib/themeAutoLoader.ts
import "server-only";

import fs from "fs";
import path from "path";
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
  const cleaned = labelOrSlug.replace(/[-_]+/g, " ").trim().toLowerCase();

  if (cleaned.includes("hoodie")) return "Hoodie Imagination";
  if (cleaned.includes("portrait")) return "Portrait Imagination";
  if (cleaned.includes("street")) return "Street Imagination";
  if (cleaned.includes("cinematic")) return "Cinematic Imagination";
  if (cleaned.includes("studio")) return "Studio Imagination";
  if (cleaned.includes("anime")) return "Anime Imagination";
  if (cleaned.includes("fashion")) return "Fashion Imagination";

  const firstWord = cleaned.split(" ").find((w) => w.length > 2) ?? "Creative";
  return `${firstWord.charAt(0).toUpperCase() + firstWord.slice(1)} Imagination`;
};

/* -----------------------------
 Types
----------------------------- */

export type Theme = {
  id: number;
  folder: string; // backend-safe slug
  label: string; // UI name
  tag: string; // UI tag
  imageUrls: string[]; // public urls
};

type ThemeBucket = {
  slug: string;
  rawFolder: string;
  files: string[];
};

/* -----------------------------
 Disk scan helpers
----------------------------- */

const isImage = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

function walkImages(dirAbs: string, relFromThemesRoot: string, out: string[]) {
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dirAbs, e.name);
    const rel = path.posix.join(relFromThemesRoot, e.name);

    if (e.isDirectory()) {
      walkImages(abs, rel, out);
    } else if (e.isFile() && isImage(e.name)) {
      out.push(rel);
    }
  }
}

/* -----------------------------
 Auto Loader (SERVER ONLY)
----------------------------- */

export const loadAllThemes = (): Theme[] => {
  // /public/themes
  const themesRootAbs = path.join(process.cwd(), "public", "themes");

  if (!fs.existsSync(themesRootAbs)) return [];

  const folderEntries = fs.readdirSync(themesRootAbs, { withFileTypes: true });
  const map: Record<string, ThemeBucket> = {};

  for (const entry of folderEntries) {
    if (!entry.isDirectory()) continue;

    const rawFolder = entry.name; // real folder name in /public/themes/<rawFolder>
    const slug = slugify(rawFolder);

    const files: string[] = [];
    const folderAbs = path.join(themesRootAbs, rawFolder);

    // collect nested image paths relative to /public/themes/<rawFolder>
    walkImages(folderAbs, rawFolder, files);

    if (!map[slug]) {
      map[slug] = { slug, rawFolder, files: [] };
    }

    map[slug].files.push(...files.map((f) => f.replace(`${rawFolder}/`, "")));
  }

  let id = 1;

  return Object.values(map)
    .map((t) => {
      const imageUrls = t.files
        .map((file) => `/themes/${t.rawFolder}/${file}`)
        .filter(Boolean);

      return {
        id: id++,
        folder: t.slug,
        label: toLabel(t.rawFolder),
        tag: toTag(t.slug),
        imageUrls,
      } satisfies Theme;
    })
    // optional: stable ordering
    .sort((a, b) => a.label.localeCompare(b.label));
};

/* -----------------------------
 Lookup Helper
----------------------------- */

export const getThemeByName = (name: string, themes: Theme[]) => {
  if (!name) return null;
  const slug = slugify(name);
  return themes.find((t) => t.folder === slug) || themes.find((t) => t.folder === name) || null;
};
