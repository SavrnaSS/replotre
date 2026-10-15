// POST   /api/custom-model/photos        multipart: file, consent=true (first upload), faces=<browser face count>
// DELETE /api/custom-model/photos?id=…   remove one photo
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import {
  getOrCreateModel,
  handleRouteError,
  requireUser,
  unauthorized,
} from "@/app/lib/customModel.server";
import {
  analyzeUpload,
  hammingHex,
  MAX_PHOTOS,
  MAX_UPLOAD_BYTES,
  referenceScore,
} from "@/app/lib/photoAnalysis.server";
import { putObject, removeObjects, signedUrl } from "@/app/lib/trainingStorage.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reject = (reason: string, status = 422, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: "photo_rejected", reason, ...extra }, { status });

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof Blob) || !file.size) return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return reject("too-large", 413);
  if (file.type && !file.type.startsWith("image/")) return reject("unsupported", 415);

  const facesRaw = Number(form.get("faces"));
  const faces = Number.isInteger(facesRaw) && facesRaw >= 0 && facesRaw < 20 ? facesRaw : null;
  const consent = form.get("consent") === "true";

  try {
    const model = await getOrCreateModel(user.id);
    if (model.status === "training") return NextResponse.json({ error: "training_in_progress" }, { status: 409 });
    if (!model.consentAt && !consent) return NextResponse.json({ error: "consent_required" }, { status: 400 });

    const existing = await prisma.customModelPhoto.findMany({
      where: { modelId: model.id },
      select: { hash: true },
    });
    if (existing.length >= MAX_PHOTOS) return reject("limit-reached", 409, { max: MAX_PHOTOS });

    const result = await analyzeUpload(Buffer.from(await file.arrayBuffer()));
    if (!result.ok) return reject(result.reason);
    if (existing.some((e) => hammingHex(e.hash, result.hash) <= 4)) return reject("duplicate", 409);
    if (faces === 0) return reject("no-face");

    const key = `${user.id}/${model.id}/${crypto.randomUUID()}.jpg`;
    await putObject(key, result.jpeg);

    let photo;
    try {
      photo = await prisma.customModelPhoto.create({
        data: {
          modelId: model.id,
          storageKey: key,
          width: result.width,
          height: result.height,
          sharpness: result.sharpness,
          brightness: result.brightness,
          hash: result.hash,
          faces,
          warnings: faces != null && faces > 1 ? [...result.warnings, "multiple-faces"] : result.warnings,
          score: referenceScore({ ...result, faces }),
        },
      });
    } catch (err) {
      await removeObjects([key]).catch(() => {});
      if ((err as { code?: string })?.code === "P2002") return reject("duplicate", 409); // concurrent dup
      throw err;
    }

    const count = existing.length + 1;
    await prisma.customModel.update({
      where: { id: model.id },
      data: { photoCount: count, ...(model.consentAt ? {} : { consentAt: new Date() }) },
    });

    return NextResponse.json(
      {
        photo: {
          id: photo.id,
          width: photo.width,
          height: photo.height,
          score: photo.score,
          faces: photo.faces,
          warnings: photo.warnings,
          isReference: false,
          thumbUrl: await signedUrl(key).catch(() => null),
        },
        photoCount: count,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleRouteError(err, "upload");
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  try {
    const photo = await prisma.customModelPhoto.findFirst({
      where: { id, model: { userId: user.id } }, // ownership check
      include: { model: true },
    });
    if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (photo.model.status === "training") return NextResponse.json({ error: "training_in_progress" }, { status: 409 });

    await removeObjects([photo.storageKey]);
    await prisma.customModelPhoto.delete({ where: { id } });
    const count = await prisma.customModelPhoto.count({ where: { modelId: photo.modelId } });
    const lostReference = photo.model.referencePhotoId === id;
    await prisma.customModel.update({
      where: { id: photo.modelId },
      data: {
        photoCount: count,
        // removing the locked reference means the model must be rebuilt
        ...(lostReference ? { referencePhotoId: null, status: "draft", trainedAt: null } : {}),
      },
    });
    return NextResponse.json({ ok: true, photoCount: count, needsRetrain: lostReference });
  } catch (err) {
    return handleRouteError(err, "delete-photo");
  }
}
