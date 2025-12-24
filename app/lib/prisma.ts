// app/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

// Prefer DATABASE_URL_LOCAL in dev, fallback to DATABASE_URL
const connectionString =
  (isProd
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL) || "";

if (!connectionString) {
  throw new Error("DATABASE_URL is missing (or DATABASE_URL_LOCAL in dev).");
}

// Prisma v6 reads DATABASE_URL from env automatically.
// We keep this file simple + stable for Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ["error"] : ["error", "warn"],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export default prisma;
