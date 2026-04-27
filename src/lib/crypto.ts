import { createHmac, randomBytes, createHash } from "node:crypto";
import { env } from "./env";

/** Salted HMAC-SHA256, hex encoded. Used for ip_hash, participant_hash, email_hash. */
export function hmac(value: string): string {
  if (!env.crypto.hashSalt) {
    throw new Error("HASH_SALT not configured");
  }
  return createHmac("sha256", env.crypto.hashSalt).update(value).digest("hex");
}

/** Plain SHA-256 hex. Used for upload integrity. */
export function sha256(buf: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

function getKey(): Buffer {
  const b64 = env.crypto.encryptionKeyBase64;
  if (!b64) throw new Error("ENCRYPTION_KEY_BASE64 not configured");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes");
  }
  return key;
}

/** AES-256-GCM encryption, returns base64 string of iv|tag|ciphertext. */
export async function encrypt(plaintext: string): Promise<string> {
  const { createCipheriv } = await import("node:crypto");
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export async function decrypt(payloadB64: string): Promise<string> {
  const { createDecipheriv } = await import("node:crypto");
  const key = getKey();
  const buf = Buffer.from(payloadB64, "base64");
  if (buf.length < 12 + 16 + 1) throw new Error("ciphertext too short");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

/** Constant-time string compare for Basic Auth etc. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  let r = 0;
  for (let i = 0; i < ab.length; i++) r |= ab[i] ^ bb[i];
  return r === 0;
}
