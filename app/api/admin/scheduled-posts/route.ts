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
  if (!userId) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const items = await prisma.scheduledPost.findMany({
    where: {
      userId,
      ...(influencerId ? { influencerId } : {}),
    },
    orderBy: [{ scheduleDate: "desc" }, { time: "desc" }],
    take: 200,
  });

  return NextResponse.json({ items }, { status: 200 });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (body?.bulk) {
    const userId = String(body?.userId || "");
    const influencerId = body?.influencerId ? String(body.influencerId) : "";
    const shiftDays = Number(body?.shiftDays || 0);
    const setTime = body?.setTime ? String(body.setTime) : "";
    if (!userId) return NextResponse.json({ error: "userId-required" }, { status: 400 });

    const items = await prisma.scheduledPost.findMany({
      where: {
        userId,
        ...(influencerId ? { influencerId } : {}),
        status: "scheduled",
      },
      orderBy: [{ scheduleDate: "asc" }, { time: "asc" }],
      take: 500,
    });

    const updates = await Promise.all(
      items.map((item) => {
        const date = new Date(item.scheduleDate);
        if (Number.isFinite(shiftDays) && shiftDays !== 0) {
          date.setDate(date.getDate() + shiftDays);
        }
        return prisma.scheduledPost.update({
          where: { id: item.id },
          data: {
            scheduleDate: date,
            time: setTime || item.time,
            status: "scheduled",
            cancelledAt: null,
            cancelledBy: null,
          },
        });
      })
    );

    await prisma.adminAction.create({
      data: {
        userId,
        adminId: admin.id,
        action: "schedule.bulk_reschedule",
        detail: `Bulk reschedule${influencerId ? ` (${influencerId})` : ""} shift=${shiftDays} setTime=${
          setTime || "—"
        }.`,
      },
    });

    publishAdminStream("schedule.updated", { userId, posts: updates });

    return NextResponse.json({ posts: updates }, { status: 200 });
  }

  const id = String(body?.id || "");
  const scheduleDate = String(body?.scheduleDate || "");
  const time = String(body?.time || "");
  if (!id || !scheduleDate || !time) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const updated = await prisma.scheduledPost.update({
    where: { id },
    data: {
      scheduleDate: new Date(scheduleDate),
      time,
      status: "scheduled",
      cancelledAt: null,
      cancelledBy: null,
    },
  });

  await prisma.adminAction.create({
    data: {
      userId: updated.userId,
      adminId: admin.id,
      action: "schedule.rescheduled",
      detail: `Rescheduled ${updated.influencerId} to ${scheduleDate} ${time}.`,
    },
  });

  publishAdminStream("schedule.updated", { userId: updated.userId, post: updated });

  return NextResponse.json({ post: updated }, { status: 200 });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (body?.bulk) {
    const userId = String(body?.userId || "");
    const influencerId = body?.influencerId ? String(body.influencerId) : "";
    const reason = String(body?.reason || "").trim();
    if (!userId) return NextResponse.json({ error: "userId-required" }, { status: 400 });

    const updated = await prisma.scheduledPost.updateMany({
      where: {
        userId,
        ...(influencerId ? { influencerId } : {}),
        status: "scheduled",
      },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: admin.id,
        adminNote: reason || null,
      },
    });

    await prisma.adminAction.create({
      data: {
        userId,
        adminId: admin.id,
        action: "schedule.bulk_cancel",
        detail: reason
          ? `Bulk cancel${influencerId ? ` (${influencerId})` : ""}. ${reason}`
          : `Bulk cancel${influencerId ? ` (${influencerId})` : ""}.`,
      },
    });

    publishAdminStream("schedule.updated", { userId, bulkCancelled: updated.count });

    return NextResponse.json({ cancelled: updated.count }, { status: 200 });
  }

  const id = String(body?.id || "");
  const reason = String(body?.reason || "").trim();
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const updated = await prisma.scheduledPost.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: admin.id,
      adminNote: reason || null,
    },
  });

  await prisma.adminAction.create({
    data: {
      userId: updated.userId,
      adminId: admin.id,
      action: "schedule.cancelled",
      detail: reason
        ? `Cancelled ${updated.influencerId}. ${reason}`
        : `Cancelled ${updated.influencerId}.`,
    },
  });

  publishAdminStream("schedule.updated", { userId: updated.userId, post: updated });

  return NextResponse.json({ post: updated }, { status: 200 });
}
