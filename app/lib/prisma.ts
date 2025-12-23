// app/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";

// ✅ Prefer DATABASE_URL_LOCAL in dev, fallback to DATABASE_URL
const connectionString =
  (isProd
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL_LOCAL || process.env.DATABASE_URL) || "";

if (!connectionString) {
  throw new Error("DATABASE_URL is missing (or DATABASE_URL_LOCAL in dev).");
}

/**
 * ✅ SSL handling
 * - If URL explicitly says no-verify/disable, respect it.
 * - Otherwise: prod uses SSL with rejectUnauthorized=true by default (can override via env).
 */
const url = connectionString.toLowerCase();
const sslModeNoVerify =
  url.includes("sslmode=no-verify") || url.includes("sslmode=verify-ca") || url.includes("sslmode=verify-full");
const sslModeDisable = url.includes("sslmode=disable");

const envRejectUnauthorized =
  process.env.PG_SSL_REJECT_UNAUTHORIZED != null
    ? process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false"
    : undefined;

const ssl =
  sslModeDisable
    ? false
    : {
        rejectUnauthorized:
          typeof envRejectUnauthorized === "boolean"
            ? envRejectUnauthorized
            : isProd
              ? !sslModeNoVerify
              : false,
      };

// ✅ Reuse pool across hot reloads in dev
const globalForPg = globalThis as unknown as { pgPool?: Pool };
const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    ssl,
  });

if (!isProd) globalForPg.pgPool = pool;

const adapter = new PrismaPg(pool);

// ✅ Reuse PrismaClient across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: isProd ? ["error"] : ["error", "warn"],
  });

if (!isProd) globalForPrisma.prisma = prisma;

export default prisma;
