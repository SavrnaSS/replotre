// app/lib/auth.ts
import crypto from "crypto";

const SECRET =
  process.env.AUTH_SECRET || process.env.JWT_SECRET || "dev_secret_change_me";

// ✅ Remove any weird unicode spaces if env was copy-pasted
const SAFE_SECRET = String(SECRET).replace(/[^\x00-\x7F]/g, "").trim();

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(input: string) {
  const pad = input.length % 4 ? "=".repeat(4 - (input.length % 4)) : "";
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function signHS256(data: string) {
  return base64url(crypto.createHmac("sha256", SAFE_SECRET).update(data).digest());
}

function sanitizeTokenString(token: string) {
  // ✅ Strip any non-ascii (fixes ByteString) + normalize whitespace
  return String(token || "").replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "").trim();
}

export function signToken(
  payload: Record<string, any>,
  expiresInSeconds = 60 * 60 * 24 * 30
) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };

  const headerPart = base64url(JSON.stringify(header));
  const payloadPart = base64url(JSON.stringify(body));
  const toSign = `${headerPart}.${payloadPart}`;
  const sig = signHS256(toSign);

  return sanitizeTokenString(`${toSign}.${sig}`);
}

export function verifyToken(token: string) {
  const clean = sanitizeTokenString(token);
  const parts = clean.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const expected = signHS256(`${h}.${p}`);
  if (s !== expected) return null;

  try {
    const payload = JSON.parse(base64urlDecode(p));
    const now = Math.floor(Date.now() / 1000);
    if (payload?.exp && now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------
  ✅ Added: getUserFromCookie(req)
  - Reads common cookie names safely
  - Returns decoded token payload (expects id/userId)
-------------------------------------------------------- */

function parseCookieHeader(cookieHeader: string | null | undefined) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.split("=");
    const key = (k || "").trim();
    if (!key) return;
    out[key] = decodeURIComponent((v.join("=") || "").trim());
  });

  return out;
}

export async function getUserFromCookie(req: Request) {
  const cookies = parseCookieHeader(req.headers.get("cookie"));

  // Try common names (keep broad so it works with your existing login impl)
  const token =
    cookies["mitux_token"] ||
    cookies["mitux_session"] ||
    cookies["auth_token"] ||
    cookies["token"] ||
    cookies["session"] ||
    "";

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Normalize id field
  const id = payload.id || payload.userId;
  if (!id) return null;

  return { ...payload, id };
}
