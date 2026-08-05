import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
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
  const f = body.data;

  if (f.is_power !== undefined) await sql`update contacts set is_power = ${f.is_power}, updated_at = now() where email = ${email}`;
  if (f.power_rank !== undefined) await sql`update contacts set power_rank = ${f.power_rank}, updated_at = now() where email = ${email}`;
  if (f.target_cadence_days !== undefined)
    await sql`update contacts set target_cadence_days = ${f.target_cadence_days}, updated_at = now() where email = ${email}`;
  if (f.notes !== undefined) await sql`update contacts set notes = ${f.notes}, updated_at = now() where email = ${email}`;
  if (f.do_not_track !== undefined) await sql`update contacts set do_not_track = ${f.do_not_track}, updated_at = now() where email = ${email}`;

  if (f.analyze_tone) {
    const sent = await listSentMessages(10, `to:${email}`);
    const excerpts = sent.map((m) => stripQuoted(m.bodyText)).filter((b) => b.length > 20);
    if (excerpts.length) {
      const tone = await analyzeTone(email, excerpts);
      await sql`update contacts set tone_score = ${tone.tone_score}, tone_summary = ${tone.tone_summary}, updated_at = now() where email = ${email}`;
      return NextResponse.json({ ok: true, tone });
    }
    return NextResponse.json({ ok: true, tone: null });
  }
  return NextResponse.json({ ok: true });
}
