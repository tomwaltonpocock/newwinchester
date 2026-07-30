import { NextRequest, NextResponse } from "next/server";

// Single-user gate: HTTP Basic Auth everywhere; cron calls pass a bearer secret.
export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";

  if (req.nextUrl.pathname === "/api/sync") {
    const cron = process.env.CRON_SECRET;
    if (cron && auth === `Bearer ${cron}`) return NextResponse.next();
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) return new NextResponse("APP_PASSWORD not configured", { status: 500 });

  if (auth.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    if (decoded === expected) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Thinkbox"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json).*)"],
};
