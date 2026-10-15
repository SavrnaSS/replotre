"use client";

import Dexie, { type EntityTable } from "dexie";
import type { PhotoReport } from "@/app/lib/photoChecks";

/**
 * Training photos picked in the homepage builder, kept in this browser's
 * IndexedDB so they survive the sign-in redirect. They are never uploaded
 * from here and expire with the builder draft (24 h).
 */

export type StoredPhoto = {
  id: string;
  name: string;
  blob: Blob;
  report: PhotoReport | null;
  createdAt: number;
};

const TTL_MS = 24 * 60 * 60 * 1000;

class PhotoDB extends Dexie {
  photos!: EntityTable<StoredPhoto, "id">;
  constructor() {
    super("replotre_builder");
    this.version(1).stores({ photos: "id, createdAt" });
  }
}

let db: PhotoDB | null = null;
function getDb() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
  if (!db) db = new PhotoDB();
  return db;
}

export async function listPhotos(): Promise<StoredPhoto[]> {
  const d = getDb();
  if (!d) return [];
  try {
    await d.photos.where("createdAt").below(Date.now() - TTL_MS).delete();
    return await d.photos.orderBy("createdAt").toArray();
  } catch {
    return [];
  }
}

export async function putPhoto(photo: StoredPhoto) {
  try {
    await getDb()?.photos.put(photo);
  } catch {
    // storage full / blocked — photos stay in memory for this visit only
  }
}

export async function deletePhoto(id: string) {
  try {
    await getDb()?.photos.delete(id);
  } catch {
    // ignore
  }
}

export async function clearPhotos() {
  try {
    await getDb()?.photos.clear();
  } catch {
    // ignore
  }
}
