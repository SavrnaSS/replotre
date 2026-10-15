import sharp from "sharp";

/**
 * Server-side re-validation of a training photo. The browser runs the same
 * checks for instant feedback, but only these results are trusted.
 * Also normalises the file: applies EXIF orientation, strips all metadata
 * (incl. GPS), caps at 2048px and re-encodes as JPEG.
 */

export const MIN_SIDE = 512;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTOS = 40;
export const MIN_PHOTOS = 20;

// Same thresholds as app/lib/photoChecks.ts (Laplacian variance on a 256px copy).
const SHARP_BAD = 25;
const SHARP_WARN = 70;

export type ServerPhotoResult =
  | { ok: false; reason: "unreadable" | "too-small" | "very-blurry" }
  | {
      ok: true;
      jpeg: Buffer;
      width: number;
      height: number;
      sharpness: number;
      brightness: number;
      hash: string;
      warnings: string[];
    };

function laplacianVariance(g: Buffer, w: number, h: number) {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

async function dHash(img: Buffer) {
  const raw = await sharp(img).resize(9, 8, { fit: "fill" }).grayscale().raw().toBuffer();
  let hex = "";
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) byte = (byte << 1) | (raw[y * 9 + x] > raw[y * 9 + x + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export function hammingHex(a: string, b: string) {
  let d = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export async function analyzeUpload(input: Buffer): Promise<ServerPhotoResult> {
  let jpeg: Buffer;
  let width = 0;
  let height = 0;
  try {
    // rotate() applies EXIF orientation; output carries no metadata by default.
    const out = await sharp(input, { failOn: "error", limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    jpeg = out.data;
    // Pre-resize dimensions decide the resolution check.
    const meta = await sharp(input).metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    width = (swap ? meta.height : meta.width) ?? out.info.width;
    height = (swap ? meta.width : meta.height) ?? out.info.height;
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  if (Math.min(width, height) < MIN_SIDE) return { ok: false, reason: "too-small" };

  const { data: gray, info } = await sharp(jpeg)
    .resize(256, 256, { fit: "inside" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sharpness = laplacianVariance(gray, info.width, info.height);
  let brightness = 0;
  for (let i = 0; i < gray.length; i++) brightness += gray[i];
  brightness /= gray.length || 1;

  if (sharpness < SHARP_BAD) return { ok: false, reason: "very-blurry" };

  const warnings: string[] = [];
  if (sharpness < SHARP_WARN) warnings.push("blurry");
  if (brightness < 45) warnings.push("too-dark");
  else if (brightness > 215) warnings.push("too-bright");

  return { ok: true, jpeg, width, height, sharpness, brightness, hash: await dHash(jpeg), warnings };
}

/**
 * Ranks a photo as an identity reference (higher is better):
 * a single visible face, sharpness, balanced exposure, resolution.
 */
export function referenceScore(p: {
  sharpness: number;
  brightness: number;
  width: number;
  height: number;
  faces: number | null;
}) {
  const sharp = Math.min(1, p.sharpness / 400);
  const exposure = 1 - Math.min(1, Math.abs(p.brightness - 128) / 128);
  const res = Math.min(1, Math.min(p.width, p.height) / 1536);
  const face = p.faces === 1 ? 1 : p.faces == null ? 0.5 : 0;
  return Number((face * 0.45 + sharp * 0.3 + exposure * 0.15 + res * 0.1).toFixed(4));
}
