import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/adminAuth";
import { publishAdminStream } from "@/app/lib/adminStream";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || "";
  const influencerId = url.searchParams.get("influencerId") || "";

  const items = await prisma.scheduleOverride.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(influencerId ? { influencerId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ items }, { status: 200 });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const userId = body?.userId ? String(body.userId) : null;
  const influencerId = body?.influencerId ? String(body.influencerId) : null;

  const created = await prisma.scheduleOverride.create({
    data: {
      userId,
      influencerId,
      disabled: Boolean(body?.disabled),
      paused: Boolean(body?.paused),
      overrideDaily:
        body?.overrideDaily === "" || body?.overrideDaily === null
          ? null
          : Number(body?.overrideDaily),
      overrideMonthly:
        body?.overrideMonthly === "" || body?.overrideMonthly === null
          ? null
          : Number(body?.overrideMonthly),
      overrideTime: body?.overrideTime ? String(body.overrideTime) : null,
      overrideTimeZone: body?.overrideTimeZone ? String(body.overrideTimeZone) : null,
      reason: body?.reason ? String(body.reason) : null,
    },
  });

  await prisma.adminAction.create({
    data: {
      userId: userId || admin.id,
      adminId: admin.id,
      action: "schedule.override",
      detail: `Override applied${userId ? ` for ${userId}` : ""}${
        influencerId ? ` / ${influencerId}` : ""
      }.`,
    },
  });

  publishAdminStream("schedule.override", { override: created });

  return NextResponse.json({ override: created }, { status: 200 });
}
