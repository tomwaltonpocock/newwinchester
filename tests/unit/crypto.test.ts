import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";

describe("crypto helpers", () => {
  beforeAll(() => {
    process.env.HASH_SALT = "test-salt-not-for-production";
    process.env.ENCRYPTION_KEY_BASE64 = randomBytes(32).toString("base64");
  });

  it("produces a stable HMAC for the same input", async () => {
    const { hmac } = await import("../../src/lib/crypto");
    expect(hmac("user@example.com")).toBe(hmac("user@example.com"));
  });

  it("produces different HMACs for different inputs", async () => {
    const { hmac } = await import("../../src/lib/crypto");
    expect(hmac("a@example.com")).not.toBe(hmac("b@example.com"));
  });

  it("encrypts and decrypts round-trip", async () => {
    const { encrypt, decrypt } = await import("../../src/lib/crypto");
    const enc = await encrypt("private contact email");
    expect(enc).not.toContain("private");
    const dec = await decrypt(enc);
    expect(dec).toBe("private contact email");
  });
});
