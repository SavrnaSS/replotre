import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "@/app/lib/prisma";
import { getUserFromCookie } from "@/app/lib/auth";
import { getInfluencerById } from "@/app/data/influencers";
import {
  addDays,
  getDateKeyInTimeZone,
  formatPreferredTime,
  getPlanSchedule,
  getDailyQuotaForPlan,
  getDayIndexInZone,
} from "@/app/lib/schedule";
import { publishAdminStream } from "@/app/lib/adminStream";

const SAFE_ID = /^[a-z0-9-]+$/i;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_DAYS = 31;

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

const getPlanForUser = async (userId: string) => {
  const [subscription, lastBilling, profile] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.billingHistory.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.onboardingProfile.findUnique({ where: { userId } }),
  ]);

  const plan =
    String(subscription?.plan || "").toLowerCase() ||
    String(lastBilling?.plan || "").toLowerCase() ||
    String(profile?.plan || "").toLowerCase() ||
    "basic";

  return { plan, profile };
};

const maybeLogExhausted = async (userId: string, influencerId: string, detail: string) => {
  const actionKey = `schedule.exhausted.${influencerId}`;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.adminAction.findFirst({
    where: { userId, action: actionKey, createdAt: { gte: cutoff } },
  });
  if (existing) return;

  const created = await prisma.adminAction.create({
    data: { userId, action: actionKey, detail },
  });
  publishAdminStream("actions.updated", { userId, action: created });
};

export async function GET(req: Request) {
  const user = await getUserFromCookie(req);
  if (!user?.id) {
    return NextResponse.json({ items: [], exhausted: false }, { status: 401 });
  }

  const url = new URL(req.url);
  const influencerId = (url.searchParams.get("influencerId") || "").trim();
  const daysParam = Number(url.searchParams.get("days") || 7);
  const days = Number.isFinite(daysParam)
    ? Math.max(1, Math.min(MAX_DAYS, Math.floor(daysParam)))
    : 7;

  if (!influencerId || !SAFE_ID.test(influencerId)) {
    return NextResponse.json({ items: [], exhausted: false }, { status: 200 });
  }

  const influencer = getInfluencerById(influencerId);
  if (!influencer) {
    return NextResponse.json({ items: [], exhausted: false }, { status: 200 });
  }

  const baseRoot = path.join(process.cwd(), "public", "uploads", "influencers");
  const publicFolder = encodeURIComponent(influencer.folderName);
  const influencerDir = path.join(baseRoot, influencer.folderName);
  const images =
    (await loadImages(influencerDir, `/uploads/influencers/${publicFolder}`)) || [];

  if (!images.length) {
    await maybeLogExhausted(
      user.id,
      influencerId,
      `No scheduled assets found for ${influencer.name}.`
    );
    return NextResponse.json(
      {
        items: [],
        exhausted: true,
        reason: "no-images",
      },
      { status: 200 }
    );
  }

  const { plan, profile } = await getPlanForUser(user.id);
  const scheduleConfig = getPlanSchedule(plan);
  const niche = (profile?.data as Record<string, any> | null)?.niche || "—";
  const preferredTime = formatPreferredTime(
    (profile?.data as Record<string, any> | null)?.scheduleTime || ""
  );
  const baseTimeZone =
    (profile?.data as Record<string, any> | null)?.scheduleTimeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const startDate = new Date();
  const endDate = addDays(startDate, days - 1);
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const [existingInRange, usedImages, overrides, earliestScheduled] = await Promise.all([
    prisma.scheduledPost.findMany({
      where: {
        userId: user.id,
        influencerId,
        scheduleDate: {
          gte: startDay,
          lte: endDay,
        },
        status: "scheduled",
      },
      orderBy: [{ scheduleDate: "asc" }, { time: "asc" }],
    }),
    prisma.scheduledPost.findMany({
      where: { userId: user.id, influencerId, status: "scheduled" },
      select: { imageSrc: true },
    }),
    prisma.scheduleOverride.findMany({
      where: {
        OR: [
          { userId: user.id, influencerId },
          { userId: user.id, influencerId: null },
          { userId: null, influencerId },
          { userId: null, influencerId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scheduledPost.findFirst({
      where: { userId: user.id, influencerId, status: "scheduled" },
      orderBy: { scheduleDate: "asc" },
    }),
  ]);

  const override =
    overrides.find((o) => o.userId === user.id && o.influencerId === influencerId) ||
    overrides.find((o) => o.userId === user.id && !o.influencerId) ||
    overrides.find((o) => !o.userId && o.influencerId === influencerId) ||
    overrides.find((o) => !o.userId && !o.influencerId) ||
    null;

  const overrideMonthly = typeof override?.overrideMonthly === "number" ? override.overrideMonthly : null;

  if (override?.disabled) {
    await maybeLogExhausted(
      user.id,
      influencerId,
      override.reason || "Scheduling disabled by admin."
    );
    return NextResponse.json(
      { items: [], exhausted: true, reason: "admin-disabled" },
      { status: 200 }
    );
  }

  const resolvedTimeZone = override?.overrideTimeZone || baseTimeZone;
  const overrideTime = override?.overrideTime || "";
  const resolvedPreferred = overrideTime ? formatPreferredTime(overrideTime) : preferredTime;
  const resolvedTimes = resolvedPreferred
    ? [
        resolvedPreferred,
        ...scheduleConfig.times.filter((time) => time !== resolvedPreferred),
      ]
    : scheduleConfig.times;

  const usedSet = new Set(usedImages.map((item) => item.imageSrc));
  const availableImages = images.filter((src) => !usedSet.has(src));
  let imageIndex = 0;
  const itemsToCreate: Array<{
    userId: string;
    influencerId: string;
    imageSrc: string;
    scheduleDate: Date;
    time: string;
    label: string;
    title: string;
  }> = [];

  const existingByDate = new Map<string, typeof existingInRange>();
  for (const item of existingInRange) {
    const key = getDateKeyInTimeZone(item.scheduleDate, resolvedTimeZone);
    const bucket = existingByDate.get(key) || [];
    bucket.push(item);
    existingByDate.set(key, bucket);
  }

  let exhausted = false;
  let exhaustedReason: string | null = null;
  const anchorDate = earliestScheduled?.scheduleDate || startDay;
  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addDays(startDay, dayOffset);
    const dateKey = getDateKeyInTimeZone(date, resolvedTimeZone);
    const dayIndex = getDayIndexInZone(anchorDate, date, resolvedTimeZone);
    const dailyQuota =
      typeof override?.overrideDaily === "number"
        ? override.overrideDaily
        : overrideMonthly !== null
        ? Math.floor(overrideMonthly / 30) + (dayIndex < (overrideMonthly % 30) ? 1 : 0)
        : getDailyQuotaForPlan(plan, dayIndex);
    if (dailyQuota <= 0) continue;

    const existingForDay = existingByDate.get(dateKey) || [];
    const existingTimes = new Set(existingForDay.map((item) => item.time));

    for (let slot = 0; slot < dailyQuota; slot += 1) {
      const time = resolvedTimes[slot % resolvedTimes.length];
      if (existingTimes.has(time)) continue;

      if (imageIndex >= availableImages.length) {
        exhausted = true;
        break;
      }

      const imageSrc = availableImages[imageIndex];
      imageIndex += 1;
      itemsToCreate.push({
        userId: user.id,
        influencerId,
        imageSrc,
        scheduleDate: date,
        time,
        label: scheduleConfig.label,
        title: `${niche} studio post`,
      });
    }

    if (exhausted) break;
  }

  if (itemsToCreate.length && !override?.paused) {
    await prisma.scheduledPost.createMany({ data: itemsToCreate, skipDuplicates: true });
  }

  const updated = await prisma.scheduledPost.findMany({
    where: {
      userId: user.id,
      influencerId,
      scheduleDate: {
        gte: startDay,
        lte: endDay,
      },
      status: "scheduled",
    },
    orderBy: [{ scheduleDate: "asc" }, { time: "asc" }],
  });

  const itemsByDate = new Map<string, typeof updated>();
  for (const item of updated) {
    const key = getDateKeyInTimeZone(item.scheduleDate, resolvedTimeZone);
    const bucket = itemsByDate.get(key) || [];
    bucket.push(item);
    itemsByDate.set(key, bucket);
  }

  const items: Array<{
    id: string;
    time: string;
    label: string;
    title: string;
    src: string;
    dateKey: string;
    scheduleDate: string;
  }> = [];

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addDays(startDay, dayOffset);
    const dateKey = getDateKeyInTimeZone(date, resolvedTimeZone);
    const dayIndex = getDayIndexInZone(anchorDate, date, resolvedTimeZone);
    const dailyQuota =
      typeof override?.overrideDaily === "number"
        ? override.overrideDaily
        : overrideMonthly !== null
        ? Math.floor(overrideMonthly / 30) + (dayIndex < (overrideMonthly % 30) ? 1 : 0)
        : getDailyQuotaForPlan(plan, dayIndex);
    if (dailyQuota <= 0) continue;

    const dayItems = (itemsByDate.get(dateKey) || [])
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, dailyQuota);

    for (const item of dayItems) {
      items.push({
        id: item.id,
        time: item.time,
        label: item.label,
        title: item.title,
        src: item.imageSrc,
        dateKey,
        scheduleDate: item.scheduleDate.toISOString(),
      });
    }
  }

  const remainingImages = Math.max(0, availableImages.length - imageIndex);
  if (remainingImages === 0) {
    exhausted = true;
    exhaustedReason = "exhausted";
  }

  if (exhausted && items.length === 0) {
    const detail =
      remainingImages === 0
        ? `Scheduled assets exhausted for ${influencer.name}.`
        : "Scheduling unavailable.";
    await maybeLogExhausted(user.id, influencerId, detail);
  }

  return NextResponse.json(
    {
      items,
      exhausted,
      reason: exhaustedReason,
      remaining: remainingImages,
    },
    { status: 200 }
  );
}
