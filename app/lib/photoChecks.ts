"use client";

/**
 * In-browser quality checks for training photos. Nothing leaves the device.
 * - decode + resolution
 * - sharpness (variance of the Laplacian on a downscaled grayscale copy)
 * - exposure (mean luminance)
 * - near-duplicates (64-bit difference hash)
 * - faces (face-api tiny face detector, model served from /models/face-api)
 */

export type PhotoIssue =
  | "unsupported"
  | "too-small"
  | "no-face"
  | "duplicate"
  | "very-blurry"
  | "blurry"
  | "multiple-faces"
  | "small-face"
  | "too-dark"
  | "too-bright";

export type PhotoVerdict = "good" | "warn" | "bad";

export type PhotoReport = {
  verdict: PhotoVerdict;
  issues: PhotoIssue[];
  width: number;
  height: number;
  /** Laplacian variance on a 256px copy; higher is sharper. */
  sharpness: number;
  brightness: number;
  /** null when face detection couldn't run (model failed to load). */
  faces: number | null;
  hash: string;
};

export const MIN_SIDE = 512;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

const BAD: PhotoIssue[] = ["unsupported", "too-small", "no-face", "duplicate", "very-blurry"];

export const ISSUE_LABEL: Record<PhotoIssue, string> = {
  unsupported: "Can’t read this file — use JPG, PNG or WebP",
  "too-small": `Too small — at least ${MIN_SIDE}px on the short side`,
  "no-face": "No face found",
  duplicate: "Looks like a duplicate",
  "very-blurry": "Too blurry",
  blurry: "A little soft",
  "multiple-faces": "More than one face",
  "small-face": "Face is small in frame",
  "too-dark": "Quite dark",
  "too-bright": "Overexposed",
};

export const ISSUE_SHORT: Record<PhotoIssue, string> = {
  unsupported: "Format",
  "too-small": "Too small",
  "no-face": "No face",
  duplicate: "Duplicate",
  "very-blurry": "Blurry",
  blurry: "Soft",
  "multiple-faces": "2+ faces",
  "small-face": "Small face",
  "too-dark": "Dark",
  "too-bright": "Bright",
};

/* ---------------- face detection (lazy) ---------------- */

type FaceApi = typeof import("@vladmandic/face-api");
let faceApiPromise: Promise<FaceApi | null> | null = null;

/** Loads face-api + the 190 KB tiny detector once; resolves null if unavailable. */
export function loadFaceDetector(): Promise<FaceApi | null> {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      try {
        const faceapi = await import("@vladmandic/face-api");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models/face-api");
        return faceapi;
      } catch (err) {
        console.warn("[photoChecks] face detection unavailable:", err);
        return null;
      }
    })();
  }
  return faceApiPromise;
}

/* ---------------- pixel helpers ---------------- */

function drawScaled(bitmap: ImageBitmap, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

function grayscale(data: Uint8ClampedArray) {
  const g = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    g[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return g;
}

function laplacianVariance(g: Float32Array, w: number, h: number) {
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

/** 64-bit difference hash as a 16-char hex string. */
function dHash(bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = 9;
  canvas.height = 8;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, 9, 8);
  const g = grayscale(ctx.getImageData(0, 0, 9, 8).data);
  let hex = "";
  for (let y = 0; y < 8; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) {
      byte = (byte << 1) | (g[y * 9 + x] > g[y * 9 + x + 1] ? 1 : 0);
    }
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

/* ---------------- main entry ---------------- */

// Thresholds measured on the 256px copy.
const SHARP_BAD = 25;
const SHARP_WARN = 70;

export async function analyzePhoto(file: Blob, existingHashes: string[]): Promise<PhotoReport> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { verdict: "bad", issues: ["unsupported"], width: 0, height: 0, sharpness: 0, brightness: 0, faces: null, hash: "" };
  }

  const issues: PhotoIssue[] = [];
  const { width, height } = bitmap;
  if (Math.min(width, height) < MIN_SIDE) issues.push("too-small");

  const hash = dHash(bitmap);
  if (existingHashes.some((h) => h && hammingHex(h, hash) <= 4)) issues.push("duplicate");

  const small = drawScaled(bitmap, 256);
  const gray = grayscale(small.ctx.getImageData(0, 0, small.w, small.h).data);
  const sharpness = laplacianVariance(gray, small.w, small.h);
  let brightness = 0;
  for (let i = 0; i < gray.length; i++) brightness += gray[i];
  brightness /= gray.length || 1;

  if (sharpness < SHARP_BAD) issues.push("very-blurry");
  else if (sharpness < SHARP_WARN) issues.push("blurry");
  if (brightness < 45) issues.push("too-dark");
  else if (brightness > 215) issues.push("too-bright");

  let faces: number | null = null;
  const faceapi = await loadFaceDetector();
  if (faceapi) {
    try {
      const mid = drawScaled(bitmap, 640);
      const detections = await faceapi.detectAllFaces(
        mid.canvas,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 })
      );
      faces = detections.length;
      if (faces === 0) issues.push("no-face");
      else if (faces > 1) issues.push("multiple-faces");
      else {
        const box = detections[0].box;
        if ((box.width * box.height) / (mid.w * mid.h) < 0.012) issues.push("small-face");
      }
    } catch (err) {
      console.warn("[photoChecks] detection failed:", err);
    }
  }

  bitmap.close?.();
  const verdict: PhotoVerdict = issues.some((i) => BAD.includes(i)) ? "bad" : issues.length ? "warn" : "good";
  return { verdict, issues, width, height, sharpness, brightness, faces, hash };
}
