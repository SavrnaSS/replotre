// prisma.config.ts
import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";
import path from "path";

// load env (root .env and optional .env.local)
loadEnv({ path: path.resolve(process.cwd(), ".env"), override: true });
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL || DATABASE_URL;

if (!DATABASE_URL) throw new Error("Missing DATABASE_URL in .env");
if (!DIRECT_URL) throw new Error("Missing DIRECT_URL in .env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // ✅ Prisma 7.2 expects these keys at this level
    url: DATABASE_URL,
    directUrl: DIRECT_URL,
  },
});
