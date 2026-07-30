import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeCustomStat } from "@/lib/stats";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({ prompt: z.string().min(3).max(300), keep: z.boolean().optional() });

export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const stat = await computeCustomStat(body.data.prompt);
    if (body.data.keep) {
      await db().from("stat_prefs").upsert({
        stat_key: stat.key,
        kept: true,
        custom_prompt: body.data.prompt,
        updated_at: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true, stat });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
