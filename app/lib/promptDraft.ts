"use client";

import { useSyncExternalStore } from "react";

/**
 * Carries the idea typed into the homepage prompt bar through sign-in
 * (including the Google OAuth round trip) to the Generate page.
 * localStorage survives the redirect; the draft expires after an hour.
 */

export type PromptDraftMode = "photo" | "video" | "upscale";
export type PromptDraft = { text: string; mode: PromptDraftMode; savedAt: number };

const KEY = "rp_prompt_draft";
const TTL_MS = 60 * 60 * 1000;
const CHANGE_EVENT = "rp:prompt-draft";

function parse(raw: string | null): PromptDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<PromptDraft>;
    if (typeof d?.text !== "string" || !d.text.trim()) return null;
    if (typeof d.savedAt !== "number" || Date.now() - d.savedAt > TTL_MS) return null;
    const mode: PromptDraftMode =
      d.mode === "video" || d.mode === "upscale" ? d.mode : "photo";
    return { text: d.text.trim().slice(0, 1000), mode, savedAt: d.savedAt };
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function savePromptDraft(text: string, mode: PromptDraftMode) {
  const trimmed = text.trim();
  try {
    if (!trimmed) localStorage.removeItem(KEY);
    else
      localStorage.setItem(
        KEY,
        JSON.stringify({ text: trimmed.slice(0, 1000), mode, savedAt: Date.now() })
      );
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // storage unavailable (private mode, blocked) — the draft is a convenience only
  }
}

export function peekPromptDraft(): PromptDraft | null {
  return parse(readRaw());
}

export function clearPromptDraft() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

/** Reads the draft once and removes it, so it's only applied a single time. */
export function takePromptDraft(): PromptDraft | null {
  const draft = peekPromptDraft();
  if (draft) clearPromptDraft();
  else {
    // drop expired or malformed entries
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
  return draft;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Live view of the pending draft without consuming it (null during SSR). */
export function usePromptDraft(): PromptDraft | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return parse(raw);
}
