import { env } from "./env";
import { safeEqual } from "./crypto";

/**
 * HTTP Basic Auth check for /admin. Set ADMIN_PASSWORD_FALLBACK as `user:password`.
 * Returns a Response if auth failed (caller should return it), or null on success.
 */
export function checkAdminBasicAuth(req: Request): Response | null {
  const expected = env.admin.passwordFallback;
  if (!expected || !expected.includes(":")) {
    return new Response("Admin auth not configured. Set ADMIN_PASSWORD_FALLBACK=user:password.", {
      status: 503,
    });
  }
  const header = req.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Basic" || !token) {
    return unauthorized();
  }
  let decoded = "";
  try {
    decoded = Buffer.from(token, "base64").toString("utf8");
  } catch {
    return unauthorized();
  }
  if (!safeEqual(decoded, expected)) return unauthorized();
  return null;
}

function unauthorized(): Response {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Vision for Winchester admin"',
    },
  });
}
