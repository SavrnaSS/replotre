// app/lib/themeAutoLoader.server.ts
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
  const cleaned = labelOrSlug
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();

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

export type Theme = {
  id: number;
  folder: string; // backend-safe slug
  label: string;
  tag: string;
  imageUrls: string[];
};

type ThemeBucket = {
  slug: string; // backend-safe
  rawFolder: string; // REAL folder on disk
  files: string[]; // relative file paths
};

function isImageFile(name: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(name);
}

function walkDir(dirAbs: string, relFromThemesRoot = ""): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dirAbs)) return out;

  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(dirAbs, ent.name);
    const rel = relFromThemesRoot ? `${relFromThemesRoot}/${ent.name}` : ent.name;

    if (ent.isDirectory()) {
      out.push(...walkDir(abs, rel));
    } else if (ent.isFile() && isImageFile(ent.name)) {
      out.push(rel);
    }
  }
  return out;
}

export function loadAllThemes(): Theme[] {
  // public/themes (absolute)
  const themesRoot = path.join(process.cwd(), "public", "themes");

  // Collect all images under public/themes/**/*
  const all = walkDir(themesRoot);

  // Group by first folder segment
  const map: Record<string, ThemeBucket> = {};

  for (const rel of all) {
    // Example rel: "Cinematic Portrait/men/black/01.jpg"
    const parts = rel.split("/");
    const rawFolder = parts[0];
    if (!rawFolder) continue;

    const slug = slugify(rawFolder);
    const subPath = parts.slice(1).join("/"); // "men/black/01.jpg"
    if (!subPath) continue;

    if (!map[slug]) {
      map[slug] = { slug, rawFolder, files: [] };
    }
    map[slug].files.push(subPath);
  }

  // Build final themes list
  let id = 1;

  return Object.values(map).map((t) => ({
    id: id++,
    folder: t.slug,
    label: toLabel(t.rawFolder),
    tag: toTag(t.slug),
    imageUrls: t.files.map((file) => `/themes/${t.rawFolder}/${file}`),
  }));
}

export function getThemeByName(name: string, themes: Theme[]) {
  if (!name) return null;
  const slug = slugify(name);
  return themes.find((t) => t.folder === slug) || themes.find((t) => t.folder === name) || null;
}
