import { NextResponse } from "next/server";
import { runSync, refreshWarmth } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle() {
  try {
    const result = await runSync({ maxMessages: 40 });
    await refreshWarmth().catch(() => 0);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "sync failed" }, { status: 500 });
  }
}

export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}
