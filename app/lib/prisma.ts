// app/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

type UrlCandidate = {
  key: string;
  value: string | undefined;
};

const pickFirstUrl = (candidates: UrlCandidate[]) => {
  for (const candidate of candidates) {
    if (candidate.value && candidate.value.trim()) {
      return { key: candidate.key, value: candidate.value.trim() };
    }
  }
  return { key: "", value: "" };
};

// In production, support Vercel/Supabase common envs.
// In development, prefer DATABASE_URL_LOCAL.
const resolved = pickFirstUrl(
  isProd
    ? [
        { key: "DATABASE_URL", value: process.env.DATABASE_URL },
        { key: "POSTGRES_PRISMA_URL", value: process.env.POSTGRES_PRISMA_URL },
        { key: "POSTGRES_URL", value: process.env.POSTGRES_URL },
        { key: "DATABASE_URL_LOCAL", value: process.env.DATABASE_URL_LOCAL },
      ]
    : [
        { key: "DATABASE_URL_LOCAL", value: process.env.DATABASE_URL_LOCAL },
        { key: "DATABASE_URL", value: process.env.DATABASE_URL },
        { key: "POSTGRES_PRISMA_URL", value: process.env.POSTGRES_PRISMA_URL },
        { key: "POSTGRES_URL", value: process.env.POSTGRES_URL },
      ]
);

const withDevPoolLimits = (url: string) => {
  if (isProd || !url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "5");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "60");
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

const connectionString = withDevPoolLimits(resolved.value);

if (!connectionString) {
  throw new Error(
    "Database env missing. Set one of: DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL, DATABASE_URL_LOCAL."
  );
}

// Prisma v6 reads DATABASE_URL from env automatically.
// We keep this file simple + stable for Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: connectionString,
    // Keep dev output readable: route handlers already surface actionable errors.
    log: isProd ? ["error"] : ["warn"],
  });

if (!isProd) globalForPrisma.prisma = prisma;

if (!isProd) {
  // Useful in dev without exposing secrets.
  // eslint-disable-next-line no-console
  console.log(`[prisma] using connection from ${resolved.key}`);
}

export default prisma;
