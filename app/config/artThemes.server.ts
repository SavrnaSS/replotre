// app/config/artThemes.server.ts
import "server-only";

import { loadAllThemes, type Theme } from "@/app/lib/themeAutoLoader";

export type { Theme };

export function getArtThemes(): Theme[] {
  return loadAllThemes();
}
