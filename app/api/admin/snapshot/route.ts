import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const scheduleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [users, subscriptions, history, requests, refunds, scheduleAlerts] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        onboardingProfile: true,
        subscriptions: true,
      },
      take: 200,
    }),
    prisma.subscription.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.billingHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.onboardingChangeRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.refundRequest.findMany({
      orderBy: { requestedAt: "desc" },
      take: 200,
    }),
    prisma.adminAction.findMany({
      where: {
        action: { startsWith: "schedule.exhausted." },
        createdAt: { gte: scheduleCutoff },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
  ]);

  const baseRoot = path.join(process.cwd(), "public", "uploads", "influencers");
  const imageCache = new Map<string, number>();

  const getImagesCount = async (folderName: string) => {
    if (imageCache.has(folderName)) return imageCache.get(folderName) || 0;
    try {
      const entries = await fs.readdir(path.join(baseRoot, folderName));
      const count = entries.filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name)).length;
      imageCache.set(folderName, count);
      return count;
    } catch {
      imageCache.set(folderName, 0);
      return 0;
    }
  };

  const getInfluencerId = (action: string) => {
    const parts = action.split("schedule.exhausted.");
    return parts.length > 1 ? parts[1] : "";
  };

  const alertMeta = scheduleAlerts.map((alert) => ({
    alert,
    influencerId: getInfluencerId(alert.action),
    userId: alert.userId,
  }));

  const influencerIds = Array.from(
    new Set(alertMeta.map((entry) => entry.influencerId).filter(Boolean))
  );
  const userIds = Array.from(new Set(alertMeta.map((entry) => entry.userId).filter(Boolean)));

  const overrides = await prisma.scheduleOverride.findMany({
    where: {
      OR: [
        { userId: { in: userIds }, influencerId: { in: influencerIds } },
        { userId: { in: userIds }, influencerId: null },
        { userId: null, influencerId: { in: influencerIds } },
        { userId: null, influencerId: null },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const pickOverride = (userId: string, influencerId: string) =>
    overrides.find((o) => o.userId === userId && o.influencerId === influencerId) ||
    overrides.find((o) => o.userId === userId && !o.influencerId) ||
    overrides.find((o) => !o.userId && o.influencerId === influencerId) ||
    overrides.find((o) => !o.userId && !o.influencerId) ||
    null;

  const activeAlerts = [];
  for (const entry of alertMeta) {
    const influencerId = entry.influencerId;
    const userId = entry.userId;
    if (!influencerId || !userId) {
      activeAlerts.push(entry.alert);
      continue;
    }

    const override = pickOverride(userId, influencerId);
    if (override?.disabled) {
      activeAlerts.push(entry.alert);
      continue;
    }

    const imagesCount = await getImagesCount(influencerId);
    if (imagesCount === 0) {
      activeAlerts.push(entry.alert);
      continue;
    }

    const scheduledCount = await prisma.scheduledPost.count({
      where: { userId, influencerId, status: "scheduled" },
    });

    if (scheduledCount >= imagesCount) {
      activeAlerts.push(entry.alert);
    }
  }

  return NextResponse.json(
    { users, subscriptions, history, requests, refunds, scheduleAlerts: activeAlerts },
    { status: 200 }
  );
}
