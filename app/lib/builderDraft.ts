"use client";

/**
 * Choices made in the homepage influencer builder before sign-in.
 * Saved to localStorage so they survive the login / Google OAuth redirect,
 * then loaded once by the onboarding at /workspace.
 * Values mirror the onboarding's own option keys.
 */

export type BuilderNiche =
  | "fashion"
  | "fitness"
  | "travel"
  | "tech"
  | "food"
  | "art"
  | "finance"
  | "other";
export type BuilderStyle = "ultra" | "stylized" | "fantasy" | "anime";
export type BuilderFrequency = "daily" | "3x" | "weekly" | "occasionally";

export type BuilderDraft = {
  influencerId: string;
  aiName: string;
  niche: BuilderNiche;
  visualStyle: BuilderStyle;
  platforms: { instagram: boolean; youtube: boolean; tiktok: boolean };
  frequency: BuilderFrequency;
  contentTypes: { photos: boolean; videos: boolean };
  /** "custom" = the visitor's own photos (kept on-device in IndexedDB). */
  method?: "market" | "custom";
  /** Usable training photos at the time of saving (custom only). */
  photoCount?: number;
};

const KEY = "rp_builder_draft";
const TTL_MS = 24 * 60 * 60 * 1000;

const NICHES: BuilderNiche[] = ["fashion", "fitness", "travel", "tech", "food", "art", "finance", "other"];
const STYLES: BuilderStyle[] = ["ultra", "stylized", "fantasy", "anime"];
const FREQS: BuilderFrequency[] = ["daily", "3x", "weekly", "occasionally"];

export function saveBuilderDraft(draft: BuilderDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // storage unavailable — onboarding simply starts from scratch
  }
}

/** Reads the draft once and removes it. Invalid or expired drafts are dropped. */
export function takeBuilderDraft(): BuilderDraft | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (typeof d?.savedAt !== "number" || Date.now() - d.savedAt > TTL_MS) return null;
    if (typeof d.influencerId !== "string" || !d.influencerId) return null;
    const bool = (v: unknown) => v === true;
    return {
      influencerId: d.influencerId,
      aiName: typeof d.aiName === "string" ? d.aiName.trim().slice(0, 40) : "",
      niche: NICHES.includes(d.niche) ? d.niche : "fitness",
      visualStyle: STYLES.includes(d.visualStyle) ? d.visualStyle : "ultra",
      platforms: {
        instagram: bool(d.platforms?.instagram),
        youtube: bool(d.platforms?.youtube),
        tiktok: bool(d.platforms?.tiktok),
      },
      frequency: FREQS.includes(d.frequency) ? d.frequency : "daily",
      contentTypes: {
        photos: bool(d.contentTypes?.photos),
        videos: bool(d.contentTypes?.videos),
      },
      method: d.method === "custom" ? "custom" : "market",
      photoCount: Number.isFinite(d.photoCount) ? Math.max(0, Math.min(40, Math.floor(d.photoCount))) : 0,
    };
  } catch {
    return null;
  }
}

export function hasBuilderDraft(): boolean {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return false;
  }
}
