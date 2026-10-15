/**
 * Private Supabase Storage bucket for custom-model training photos.
 * Uses the service-role key over the Storage REST API — never exposed to the browser.
 */

const BUCKET = process.env.TRAINING_PHOTOS_BUCKET || "training-photos";
const MAX_OBJECT_BYTES = 6 * 1024 * 1024; // re-encoded JPEGs are far smaller

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("storage_not_configured");
  }
}

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new StorageNotConfiguredError();
  return { url, key };
}

function headers(extra?: Record<string, string>) {
  const { key } = config();
  return { Authorization: `Bearer ${key}`, apikey: key, ...extra };
}

let bucketReady: Promise<void> | null = null;

/** Creates the private bucket on first use (idempotent). */
function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { url } = config();
      const res = await fetch(`${url}/storage/v1/bucket`, {
        method: "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: BUCKET,
          name: BUCKET,
          public: false,
          file_size_limit: MAX_OBJECT_BYTES,
          allowed_mime_types: ["image/jpeg"],
        }),
      });
      if (res.ok) return;
      const text = await res.text().catch(() => "");
      // already exists → fine
      if (res.status === 409 || /already exists|Duplicate/i.test(text)) return;
      bucketReady = null;
      throw new Error(`bucket_create_failed: ${res.status} ${text.slice(0, 200)}`);
    })();
  }
  return bucketReady;
}

const objectPath = (key: string) => key.split("/").map(encodeURIComponent).join("/");

export async function putObject(key: string, body: Buffer, contentType = "image/jpeg") {
  await ensureBucket();
  const { url } = config();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath(key)}`, {
    method: "POST",
    headers: headers({ "Content-Type": contentType, "x-upsert": "true", "cache-control": "private, max-age=0" }),
    body: new Uint8Array(body),
  });
  if (!res.ok) {
    throw new Error(`storage_upload_failed: ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
}

export async function getObject(key: string): Promise<Buffer> {
  const { url } = config();
  const res = await fetch(`${url}/storage/v1/object/authenticated/${BUCKET}/${objectPath(key)}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`storage_download_failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function removeObjects(keys: string[]) {
  if (!keys.length) return;
  const { url } = config();
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: keys }),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`storage_delete_failed: ${res.status}`);
  }
}

/** Short-lived URL so the owner can see their own thumbnails. */
export async function signedUrl(key: string, expiresInSeconds = 600): Promise<string | null> {
  const { url } = config();
  const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${objectPath(key)}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { signedURL?: string } | null;
  return data?.signedURL ? `${url}/storage/v1${data.signedURL}` : null;
}
