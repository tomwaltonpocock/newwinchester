import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeCustomStat } from "@/lib/stats";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({ prompt: z.string().min(3).max(300), keep: z.boolean().optional() });

export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const stat = await computeCustomStat(body.data.prompt);
    if (body.data.keep) {
      await sql`
        insert into stat_prefs (stat_key, kept, custom_prompt, updated_at)
        values (${stat.key}, true, ${body.data.prompt}, now())
        on conflict (stat_key) do update set kept = true, custom_prompt = excluded.custom_prompt, updated_at = now()`;
    }
    return NextResponse.json({ ok: true, stat });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
