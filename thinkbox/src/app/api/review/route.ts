import { NextResponse } from "next/server";
import { buildWeeklyReview } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const review = await buildWeeklyReview();
    return NextResponse.json({ ok: true, ...review });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
