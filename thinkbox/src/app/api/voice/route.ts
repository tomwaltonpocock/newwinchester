import { NextResponse } from "next/server";
import { buildVoiceProfile } from "@/lib/voice";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const res = await buildVoiceProfile();
    return NextResponse.json({ ok: true, samples: res.samples });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
