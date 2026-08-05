import { NextRequest, NextResponse } from "next/server";

// Single-user gate: HTTP Basic Auth everywhere; Vercel cron calls pass through.
export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";

  if (req.nextUrl.pathname === "/api/sync") {
    const cron = process.env.CRON_SECRET;
    // With CRON_SECRET set, Vercel sends it as a bearer token. Without it,
    // accept Vercel's cron user-agent (fine for a personal app; set the
    // secret to harden).
    if (cron && auth === `Bearer ${cron}`) return NextResponse.next();
    if (!cron && (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/")) return NextResponse.next();
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) return new NextResponse("APP_PASSWORD not configured", { status: 500 });

  if (auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
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
