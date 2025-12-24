// app/lib/loadThemeImages.ts
import fs from "fs";
import path from "path";

/**
 * ✅ Turbopack-safe loader
 * - Server: reads /public/themes/<id> and returns public URLs
 * - Client: returns []
 */
export const loadThemeImages = (id: number) => {
  if (typeof window !== "undefined") return [];

  const dir = path.join(process.cwd(), "public", "themes", String(id));
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b));

  return files.map((f) => `/themes/${id}/${encodeURIComponent(f)}`);
};
