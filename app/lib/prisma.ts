// app/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

// Prefer DATABASE_URL_LOCAL in dev, fallback to DATABASE_URL
const baseConnectionString =
  (isProd
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL) || "";

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

const connectionString = withDevPoolLimits(baseConnectionString);

if (!connectionString) {
  throw new Error("DATABASE_URL is missing (or DATABASE_URL_LOCAL in dev).");
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

export default prisma;
