function bool(v: string | undefined): boolean {
  return v === "true" || v === "1" || v === "yes";
}

export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "Vision for Winchester",
  urbanScienceUrl: process.env.NEXT_PUBLIC_URBAN_SCIENCE_URL || "",
  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "uploads",
  },
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    secret: process.env.TURNSTILE_SECRET_KEY || "",
    enabled: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!process.env.TURNSTILE_SECRET_KEY,
  },
  mailchimp: {
    apiKey: process.env.MAILCHIMP_API_KEY || "",
    serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX || "",
    audienceId: process.env.MAILCHIMP_AUDIENCE_ID || "",
    enabled:
      !!process.env.MAILCHIMP_API_KEY &&
      !!process.env.MAILCHIMP_SERVER_PREFIX &&
      !!process.env.MAILCHIMP_AUDIENCE_ID,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    campaignInbox: process.env.USER_CAMPAIGN_INBOX || "",
    fromEmail: process.env.CONTACT_FROM_EMAIL || "",
    enabled: !!process.env.RESEND_API_KEY && !!process.env.CONTACT_FROM_EMAIL,
  },
  crypto: {
    hashSalt: process.env.HASH_SALT || "",
    encryptionKeyBase64: process.env.ENCRYPTION_KEY_BASE64 || "",
  },
  admin: {
    emailAllowlist: (process.env.ADMIN_EMAIL_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    passwordFallback: process.env.ADMIN_PASSWORD_FALLBACK || "",
  },
  validation: {
    allowedPostcodeOutwards: (process.env.ALLOWED_POSTCODE_OUTWARDS || "SO22,SO23")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    storeFullPostcode: bool(process.env.STORE_FULL_POSTCODE),
    showImageSources: bool(process.env.SHOW_IMAGE_SOURCES),
  },
};

export function assertServerEnv() {
  const missing: string[] = [];
  if (!env.supabase.url) missing.push("SUPABASE_URL");
  if (!env.supabase.serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.crypto.hashSalt) missing.push("HASH_SALT");
  if (!env.crypto.encryptionKeyBase64) missing.push("ENCRYPTION_KEY_BASE64");
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
