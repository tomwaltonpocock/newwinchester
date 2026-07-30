import { NextResponse } from "next/server";
import { freeBusy } from "@/lib/calendar";
import { computeFreeSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const busy = await freeBusy(14);
    const slots = computeFreeSlots({ busy, days: 14 });
    return NextResponse.json({
      ok: true,
      slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
