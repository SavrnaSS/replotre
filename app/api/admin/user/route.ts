import prisma from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/adminAuth";
import { publishAdminStream } from "@/app/lib/adminStream";

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userId = String(body?.userId || body?.id || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "missing-userId" }, { status: 400 });
  }

  const status = typeof body?.status === "string" ? body.status.trim() : undefined;
  const credits =
    body?.credits === null || body?.credits === undefined
      ? undefined
      : Number(body.credits);
  const allowEdit =
    body?.allowEdit === undefined || body?.allowEdit === null
      ? undefined
      : Boolean(body.allowEdit);

  const updates: any = {};
  if (status) updates.status = status;
  if (Number.isFinite(credits)) updates.credits = Math.max(0, Math.floor(credits));

  const updatedUser = Object.keys(updates).length
    ? await prisma.user.update({ where: { id: userId }, data: updates })
    : await prisma.user.findUnique({ where: { id: userId } });

  if (allowEdit !== undefined) {
    const existing = await prisma.onboardingProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      await prisma.onboardingProfile.update({
        where: { userId },
        data: { allowEdit },
      });
    } else {
      await prisma.onboardingProfile.create({
        data: {
          userId,
          data: {},
          allowEdit,
        },
      });
    }
  }

  publishAdminStream("user.updated", {
    userId,
    status: updatedUser?.status ?? null,
    credits: updatedUser?.credits ?? null,
    allowEdit: allowEdit ?? null,
  });

  return NextResponse.json({ user: updatedUser }, { status: 200 });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  let userId = (url.searchParams.get("userId") || "").trim();
  if (!userId) {
    try {
      const body: any = await req.json();
      userId = String(body?.userId || body?.id || "").trim();
    } catch {
      userId = "";
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "missing-userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.email) {
    await prisma.onboardingDraft.deleteMany({ where: { email: user.email } });
  }

  await prisma.user.delete({ where: { id: userId } });

  publishAdminStream("user.deleted", { userId });

  return NextResponse.json({ ok: true }, { status: 200 });
}
