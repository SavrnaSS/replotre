import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, "public", "uploads", "influencers");
const DATA_PATH = path.join(ROOT, "app", "data", "influencers.json");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const readInfluencers = async () => {
  const raw = await fs.readFile(DATA_PATH, "utf8");
  return JSON.parse(raw);
};

const listImages = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()));
  } catch {
    return null;
  }
};

const run = async () => {
  const influencers = await readInfluencers();
  const failures = [];

  for (const influencer of influencers) {
    const folderName = influencer.folderName;
    const dir = path.join(BASE_DIR, folderName);
    const images = await listImages(dir);
    if (!images) {
      failures.push(`Missing folder: ${dir}`);
      continue;
    }
    if (images.length === 0) {
      failures.push(`No images found in: ${dir}`);
    }
  }

  if (failures.length) {
    console.error("Influencer schedule validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Influencer schedule validation passed.");
};

run().catch((err) => {
  console.error("Influencer schedule validation errored:");
  console.error(err);
  process.exit(1);
});
