import { env } from "./env";

/**
 * Verify a Cloudflare Turnstile token. If Turnstile is not configured, returns
 * `passed: true` so the rest of the validation pipeline (honeypot + rate limit)
 * still runs. Sites that require Turnstile in production should ensure the
 * env vars are set before launch.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ passed: boolean; reason?: string }> {
  if (!env.turnstile.enabled) return { passed: true, reason: "not_configured" };
  if (!token) return { passed: false, reason: "missing_token" };
  try {
    const body = new URLSearchParams();
    body.set("secret", env.turnstile.secret);
    body.set("response", token);
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" }
    );
    if (!res.ok) return { passed: false, reason: `http_${res.status}` };
    const data = (await res.json()) as { success?: boolean };
    return { passed: !!data.success };
  } catch (e) {
    return { passed: false, reason: "fetch_error" };
  }
}
