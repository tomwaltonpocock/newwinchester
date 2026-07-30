import { NextResponse } from "next/server";
import { indexRelationships, refreshWarmth } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Re-index the CRM from sent mail. */
export async function POST() {
  try {
    const res = await indexRelationships(200);
    await refreshWarmth();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
