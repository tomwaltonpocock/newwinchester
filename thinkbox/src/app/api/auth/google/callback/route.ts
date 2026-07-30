import { NextRequest, NextResponse } from "next/server";
import { saveTokensFromCode } from "@/lib/google";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return new NextResponse("Missing code", { status: 400 });
  try {
    await saveTokensFromCode(code);
    return NextResponse.redirect(`${env.appUrl()}/settings?connected=1`);
  } catch (e) {
    return new NextResponse(`Google auth failed: ${e instanceof Error ? e.message : "unknown"}`, { status: 500 });
  }
}
