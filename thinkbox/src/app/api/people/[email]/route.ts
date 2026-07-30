import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { analyzeTone } from "@/lib/triage";
import { listSentMessages } from "@/lib/gmail";
import { stripQuoted } from "@/lib/voice";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Patch = z.object({
  is_power: z.boolean().optional(),
  power_rank: z.number().int().nullable().optional(),
  target_cadence_days: z.number().int().min(1).max(365).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  do_not_track: z.boolean().optional(),
  analyze_tone: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email).toLowerCase();
  const body = Patch.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const supa = db();
  const { analyze_tone, ...fields } = body.data;

  if (Object.keys(fields).length) {
    await supa.from("contacts").update({ ...fields, updated_at: new Date().toISOString() }).eq("email", email);
  }

  if (analyze_tone) {
    const sent = await listSentMessages(10, `to:${email}`);
    const excerpts = sent.map((m) => stripQuoted(m.bodyText)).filter((b) => b.length > 20);
    if (excerpts.length) {
      const tone = await analyzeTone(email, excerpts);
      await supa
        .from("contacts")
        .update({ tone_score: tone.tone_score, tone_summary: tone.tone_summary, updated_at: new Date().toISOString() })
        .eq("email", email);
      return NextResponse.json({ ok: true, tone });
    }
    return NextResponse.json({ ok: true, tone: null });
  }
  return NextResponse.json({ ok: true });
}
