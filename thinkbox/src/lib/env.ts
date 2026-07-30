function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100",
  appPassword: () => req("APP_PASSWORD"),
  encryptionKey: () => req("ENCRYPTION_KEY_BASE64"),
  cronSecret: () => req("CRON_SECRET"),
  googleClientId: () => req("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => req("GOOGLE_CLIENT_SECRET"),
  supabaseUrl: () => req("SUPABASE_URL"),
  supabaseServiceRoleKey: () => req("SUPABASE_SERVICE_ROLE_KEY"),
  anthropicKey: () => req("ANTHROPIC_API_KEY"),
  triageModel: () => process.env.TRIAGE_MODEL ?? "claude-haiku-4-5-20251001",
  draftingModel: () => process.env.DRAFTING_MODEL ?? "claude-sonnet-5",
  archiveNoise: () => process.env.ARCHIVE_NOISE === "true",
  timezone: () => process.env.DEFAULT_TIMEZONE ?? "Europe/London",
};
