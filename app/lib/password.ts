// app/lib/password.ts
import crypto from "crypto";

function scryptAsync(password: string, salt: string, keylen: number) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

// stores as: salt:hash
export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hashHex] = String(stored || "").split(":");
  if (!salt || !hashHex) return false;

  const derived = await scryptAsync(password, salt, 64);
  const hashBuf = Buffer.from(hashHex, "hex");

  // prevent timing attacks
  if (hashBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(hashBuf, derived);
}
