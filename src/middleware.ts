import { NextRequest, NextResponse } from "next/server";

/**
 * Protect /admin routes (page renders) with HTTP Basic Auth.
 * The /api/admin/* routes do their own check so this just handles SSR.
 */
export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD_FALLBACK || "";
  if (!expected.includes(":")) {
    return new NextResponse("Admin auth not configured.", { status: 503 });
  }
  const header = req.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme === "Basic" && token) {
    let decoded = "";
    try {
      decoded = atob(token);
    } catch {
      /* fallthrough to challenge */
    }
    if (decoded === expected) return NextResponse.next();
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Vision for Winchester admin"',
    },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
