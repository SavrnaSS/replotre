import prisma from "@/app/lib/prisma";
import { getUserFromCookie } from "@/app/lib/auth";
import { isAdminEmail } from "@/app/lib/admin";

type AdminCacheEntry = {
  user: any | null;
  expiresAt: number;
};

const globalForAdmin = globalThis as unknown as {
  __adminCache?: Map<string, AdminCacheEntry>;
};

const adminCache = globalForAdmin.__adminCache ?? new Map<string, AdminCacheEntry>();
globalForAdmin.__adminCache = adminCache;

const ADMIN_CACHE_TTL_MS = 60_000;

export async function requireAdmin(req: Request) {
  const payload = await getUserFromCookie(req);
  if (!payload?.id) return null;

  const cached = adminCache.get(payload.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !isAdminEmail(user.email)) return null;
  adminCache.set(payload.id, { user, expiresAt: Date.now() + ADMIN_CACHE_TTL_MS });
  return user;
}
