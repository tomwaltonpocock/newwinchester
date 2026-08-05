import { hkdfSync } from "crypto";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Derive a stable secret from APP_PASSWORD so single-secret setups just work. */
function derive(info: string, len: number): Buffer {
  return Buffer.from(hkdfSync("sha256", req("APP_PASSWORD"), "thinkbox-v1", info, len));
}

export const env = {
  appUrl: () =>
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3100"),
  appPassword: () => req("APP_PASSWORD"),
  databaseUrl: () => {
    const v = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!v) throw new Error("Missing DATABASE_URL — in Vercel: Storage tab → Create Database → Neon Postgres");
    return v;
  },
  encryptionKey: () => process.env.ENCRYPTION_KEY_BASE64 ?? derive("token-encryption", 32).toString("base64"),
  cronSecret: () => process.env.CRON_SECRET ?? null,
  googleClientId: () => req("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => req("GOOGLE_CLIENT_SECRET"),
  anthropicKey: () => req("ANTHROPIC_API_KEY"),
  triageModel: () => process.env.TRIAGE_MODEL ?? "claude-haiku-4-5-20251001",
  draftingModel: () => process.env.DRAFTING_MODEL ?? "claude-sonnet-5",
  archiveNoise: () => process.env.ARCHIVE_NOISE === "true",
  timezone: () => process.env.DEFAULT_TIMEZONE ?? "Europe/London",
};
