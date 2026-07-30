import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "./env";

// AES-256-GCM for Google tokens at rest. Format: base64(iv | tag | ciphertext)
function key(): Buffer {
  const k = Buffer.from(env.encryptionKey(), "base64");
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY_BASE64 must decode to 32 bytes");
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
