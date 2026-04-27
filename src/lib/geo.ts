import { hmac } from "./crypto";

/**
 * Extract a likely client IP from request headers without storing the raw value.
 * Returns the salted hash plus coarse Vercel geo headers if available.
 */
export function geoFromHeaders(headers: Headers) {
  const xff = headers.get("x-forwarded-for") || "";
  const firstIp = xff.split(",")[0]?.trim() || headers.get("x-real-ip") || "";
  const ipHash = firstIp ? hmac(firstIp) : null;

  const country = headers.get("x-vercel-ip-country") || null;
  const region = headers.get("x-vercel-ip-country-region") || null;
  const city = (() => {
    const raw = headers.get("x-vercel-ip-city");
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  // Truncated UA family is enough for debugging without storing personal-ish data.
  const ua = headers.get("user-agent") || "";
  const userAgentHash = ua ? hmac(ua) : null;

  return { ipHash, country, region, city, userAgentHash };
}
