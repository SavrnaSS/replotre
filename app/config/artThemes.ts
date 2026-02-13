// app/config/artThemes.ts
export type Theme = {
  id: number;
  label: string;
  tag: string;
  folder: string;
  imageUrls: string[];
};

/**
 * ✅ Client-safe loader:
 * - Client Components call this (fetches /api/themes)
 * - Always returns an array (never undefined)
 */
export async function getArtThemes(): Promise<Theme[]> {
  try {
    const res = await fetch("/api/themes", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.themes) ? data.themes : [];
  } catch {
    return [];
  }
}

/* -----------------------------
 Prototype Faces (SANITIZED)
----------------------------- */

export const prototypeFaces = [
  { id: "proto-1", label: "Model A", imageUrl: "/model/face-4-v2.jpg" },
  { id: "proto-2", label: "Model B", imageUrl: "/model/face-5-v2.jpg" },
  { id: "proto-3", label: "Model C", imageUrl: "/model/face-6-v2.jpg" },
];
