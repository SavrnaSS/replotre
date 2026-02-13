import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getInfluencerById } from "@/app/data/influencers";

export const runtime = "nodejs";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const SAFE_ID = /^[a-z0-9-]+$/i;

const loadImages = async (dir: string, publicPrefix: string) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const images = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
      .sort()
      .map((name) => `${publicPrefix}/${name}`);
    return images;
  } catch {
    return null;
  }
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const influencerId = (url.searchParams.get("influencerId") || "").trim();
  if (!influencerId || !SAFE_ID.test(influencerId)) {
    return NextResponse.json({ images: [] }, { status: 200 });
  }

  const baseRoot = path.join(process.cwd(), "public", "uploads", "influencers");
  const influencer = getInfluencerById(influencerId);
  if (!influencer) {
    return NextResponse.json({ images: [] }, { status: 200 });
  }

  const influencerDir = path.join(baseRoot, influencer.folderName);
  const legacyScheduleDir = path.join(baseRoot, influencer.folderName, "schedule");
  const publicFolder = encodeURIComponent(influencer.folderName);

  let images: string[] = [];
  if (influencerDir) {
    const result = await loadImages(
      influencerDir,
      `/uploads/influencers/${publicFolder}`
    );
    if (result && result.length) {
      images = result;
    }
  }
  if (!images.length) {
    const legacyResult = await loadImages(
      legacyScheduleDir,
      `/uploads/influencers/${publicFolder}/schedule`
    );
    if (legacyResult && legacyResult.length) {
      images = legacyResult;
    }
  }

  if (!images.length) {
    images = [
      "/model/face-1-v2.jpg",
      "/model/face-2-v2.jpg",
      "/model/face-3-v2.jpg",
      "/model/face-4-v2.jpg",
      "/model/face-5-v2.jpg",
      "/model/face-6-v2.jpg",
    ];
  }

  return NextResponse.json({ images }, { status: 200 });
}
