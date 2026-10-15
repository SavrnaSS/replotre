// POST /api/custom-model/train
// "Training" = building a reference set: validate the photo count, pick the best
// single-face photo as the locked identity reference, verify it can be read
// back from storage, then mark the model ready and switch the profile to it.
import { NextResponse } from "next/server";
import sharp from "sharp";
import prisma from "@/app/lib/prisma";
import {
  handleRouteError,
  loadModel,
  requireUser,
  serializeModel,
  unauthorized,
} from "@/app/lib/customModel.server";
import { MIN_PHOTOS } from "@/app/lib/photoAnalysis.server";
import { getObject } from "@/app/lib/trainingStorage.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  try {
    const model = await loadModel(user.id);
    if (!model || model.photos.length < MIN_PHOTOS) {
      return NextResponse.json(
        { error: "not_enough_photos", have: model?.photos.length ?? 0, need: MIN_PHOTOS },
        { status: 422 }
      );
    }

    // Claim the job atomically so double-clicks / parallel tabs can't both run it.
    const claimed = await prisma.customModel.updateMany({
      where: { id: model.id, status: { not: "training" } },
      data: { status: "training", error: null },
    });
    if (!claimed.count) return NextResponse.json({ error: "training_in_progress" }, { status: 409 });

    try {
      // Best candidates first; photos the browser saw as multi-face go last.
      const ranked = [...model.photos]
        .filter((p) => p.faces !== 0)
        .sort((a, b) => b.score - a.score);
      if (!ranked.length) throw new Error("no_face_reference");

      let reference: (typeof ranked)[number] | null = null;
      for (const candidate of ranked.slice(0, 5)) {
        try {
          const bytes = await getObject(candidate.storageKey);
          await sharp(bytes).metadata(); // readable?
          reference = candidate;
          break;
        } catch {
          // try the next best
        }
      }
      if (!reference) throw new Error("reference_unreadable");

      await prisma.customModel.update({
        where: { id: model.id },
        data: {
          status: "ready",
          referencePhotoId: reference.id,
          trainedAt: new Date(),
          photoCount: model.photos.length,
          error: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "training_failed";
      await prisma.customModel.update({
        where: { id: model.id },
        data: { status: "failed", error: message.slice(0, 200) },
      });
      if (message === "no_face_reference" || message === "reference_unreadable") {
        return NextResponse.json({ error: message }, { status: 422 });
      }
      throw err;
    }

    // Point generation at the custom model (the model itself is already ready).
    try {
      const profile = await prisma.onboardingProfile.findUnique({ where: { userId: user.id } });
      const data = (profile?.data && typeof profile.data === "object" ? profile.data : {}) as Record<string, unknown>;
      await prisma.onboardingProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, data: { method: "custom" } },
        update: { data: { ...data, method: "custom" } },
      });
    } catch (err) {
      console.error("[custom-model:train] profile switch failed", err);
    }

    return NextResponse.json({ model: await serializeModel(await loadModel(user.id)) });
  } catch (err) {
    return handleRouteError(err, "train");
  }
}
