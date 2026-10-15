// GET    /api/custom-model  → the signed-in user's custom model + photos (signed thumbnail URLs)
// DELETE /api/custom-model  → delete the model, its rows and every stored photo
import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import {
  handleRouteError,
  loadModel,
  requireUser,
  serializeModel,
  unauthorized,
} from "@/app/lib/customModel.server";
import { removeObjects } from "@/app/lib/trainingStorage.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  try {
    const model = await loadModel(user.id);
    return NextResponse.json({ model: await serializeModel(model) });
  } catch (err) {
    return handleRouteError(err, "get");
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  try {
    const model = await loadModel(user.id);
    if (!model) return NextResponse.json({ ok: true });
    await removeObjects(model.photos.map((p) => p.storageKey));
    await prisma.customModel.delete({ where: { id: model.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "delete");
  }
}
