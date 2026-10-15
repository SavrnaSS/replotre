import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getUserFromCookie } from "@/app/lib/auth";
import { MAX_PHOTOS, MIN_PHOTOS } from "@/app/lib/photoAnalysis.server";
import { signedUrl, StorageNotConfiguredError } from "@/app/lib/trainingStorage.server";

export async function requireUser(req: Request) {
  const user = await getUserFromCookie(req);
  return user?.id ? { id: String(user.id) } : null;
}

export const unauthorized = () => NextResponse.json({ error: "not-auth" }, { status: 401 });

export function getOrCreateModel(userId: string) {
  return prisma.customModel.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

type ModelWithPhotos = NonNullable<Awaited<ReturnType<typeof loadModel>>>;

export function loadModel(userId: string) {
  return prisma.customModel.findUnique({
    where: { userId },
    include: { photos: { orderBy: { createdAt: "asc" } } },
  });
}

/** Public shape returned by every endpoint; thumbnails are short-lived signed URLs. */
export async function serializeModel(model: ModelWithPhotos | null, withThumbs = true) {
  if (!model) {
    return {
      status: "none",
      photoCount: 0,
      minPhotos: MIN_PHOTOS,
      maxPhotos: MAX_PHOTOS,
      referencePhotoId: null,
      trainedAt: null,
      error: null,
      photos: [],
    };
  }
  const photos = await Promise.all(
    model.photos.map(async (p) => ({
      id: p.id,
      width: p.width,
      height: p.height,
      score: p.score,
      faces: p.faces,
      warnings: p.warnings,
      isReference: p.id === model.referencePhotoId,
      thumbUrl: withThumbs ? await signedUrl(p.storageKey).catch(() => null) : null,
    }))
  );
  return {
    status: model.status,
    photoCount: model.photos.length,
    minPhotos: MIN_PHOTOS,
    maxPhotos: MAX_PHOTOS,
    referencePhotoId: model.referencePhotoId,
    trainedAt: model.trainedAt,
    error: model.error,
    photos,
  };
}

/** Maps infrastructure failures to clear responses. */
export function handleRouteError(err: unknown, scope: string) {
  if (err instanceof StorageNotConfiguredError) {
    return NextResponse.json(
      { error: "storage_not_configured", message: "Set NEXT_PUBLIC_SUPABASE_URL and SERVICE_ROLE_KEY." },
      { status: 503 }
    );
  }
  const code = (err as { code?: string })?.code;
  const message = err instanceof Error ? err.message : String(err);
  if (code === "P2021" || /CustomModel.*does not exist/i.test(message)) {
    return NextResponse.json(
      {
        error: "custom_model_tables_missing",
        message: "Run `npx prisma migrate deploy` to create the CustomModel tables.",
      },
      { status: 503 }
    );
  }
  if (/Can't reach database server|PrismaClientInitializationError/.test(message)) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }
  console.error(`[custom-model:${scope}]`, err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
