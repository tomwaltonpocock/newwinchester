import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase";
import { effectiveRank, updateBias } from "@/lib/rank";

export const dynamic = "force-dynamic";

const Patch = z.object({
  action: z.enum(["up", "down", "done", "dismiss", "snooze", "reopen"]),
  snooze_days: z.number().int().min(1).max(30).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = Patch.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const supa = db();
  const { data: d } = await supa.from("decisions").select("*, threads(participants)").eq("id", params.id).maybeSingle();
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { action, snooze_days } = body.data;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === "up" || action === "down") {
    const dir = action === "up" ? 1 : -1;
    patch.rank_adjust = (d.rank_adjust ?? 0) + dir;
    // learn: nudge sender + kind bias
    const participants = (d.threads?.participants ?? []) as { email: string }[];
    const sender = participants[0]?.email;
    for (const key of [sender ? `sender:${sender}` : null, `kind:${d.kind}`].filter(Boolean) as string[]) {
      const { data: b } = await supa.from("rank_bias").select("*").eq("key", key).maybeSingle();
      const next = updateBias(b?.bias ?? 0, b?.samples ?? 0, dir as 1 | -1);
      await supa.from("rank_bias").upsert({ key, bias: next.bias, samples: next.samples, updated_at: new Date().toISOString() });
    }
    patch.effective_rank = effectiveRank({
      magnitude: d.magnitude,
      rankAdjust: patch.rank_adjust as number,
      senderBias: 0,
      kindBias: 0,
      ageHours: 0,
      needsReplyBy: d.needs_reply_by ? new Date(d.needs_reply_by) : null,
    });
  } else if (action === "done") {
    patch.status = "done";
    patch.decided_at = new Date().toISOString();
  } else if (action === "dismiss") {
    patch.status = "dismissed";
  } else if (action === "reopen") {
    patch.status = "open";
  } else if (action === "snooze") {
    patch.status = "snoozed";
    patch.snoozed_until = new Date(Date.now() + (snooze_days ?? 3) * 86400_000).toISOString();
  }

  await supa.from("decisions").update(patch).eq("id", params.id);
  return NextResponse.json({ ok: true });
}
