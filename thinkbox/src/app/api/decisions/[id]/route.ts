import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { effectiveRank, updateBias } from "@/lib/rank";

export const dynamic = "force-dynamic";

const Patch = z.object({
  action: z.enum(["up", "down", "done", "dismiss", "snooze", "reopen"]),
  snooze_days: z.number().int().min(1).max(30).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = Patch.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const rows = await sql`
    select d.*, t.participants from decisions d join threads t on t.id = d.thread_id where d.id = ${params.id}`;
  const d = rows[0];
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { action, snooze_days } = body.data;

  if (action === "up" || action === "down") {
    const dir = (action === "up" ? 1 : -1) as 1 | -1;
    const rankAdjust = (d.rank_adjust ?? 0) + dir;
    // learn: nudge sender + kind bias
    const participants = (d.participants ?? []) as { email: string }[];
    const sender = participants[0]?.email;
    for (const key of [sender ? `sender:${sender}` : null, `kind:${d.kind}`].filter(Boolean) as string[]) {
      const existing = await sql`select bias, samples from rank_bias where key = ${key}`;
      const next = updateBias(existing[0]?.bias ?? 0, existing[0]?.samples ?? 0, dir);
      await sql`
        insert into rank_bias (key, bias, samples, updated_at) values (${key}, ${next.bias}, ${next.samples}, now())
        on conflict (key) do update set bias = excluded.bias, samples = excluded.samples, updated_at = now()`;
    }
    const rank = effectiveRank({
      magnitude: d.magnitude,
      rankAdjust,
      senderBias: 0,
      kindBias: 0,
      ageHours: 0,
      needsReplyBy: d.needs_reply_by ? new Date(d.needs_reply_by) : null,
    });
    await sql`update decisions set rank_adjust = ${rankAdjust}, effective_rank = ${rank}, updated_at = now() where id = ${params.id}`;
  } else if (action === "done") {
    await sql`update decisions set status = 'done', decided_at = now(), updated_at = now() where id = ${params.id}`;
  } else if (action === "dismiss") {
    await sql`update decisions set status = 'dismissed', updated_at = now() where id = ${params.id}`;
  } else if (action === "reopen") {
    await sql`update decisions set status = 'open', updated_at = now() where id = ${params.id}`;
  } else if (action === "snooze") {
    const until = new Date(Date.now() + (snooze_days ?? 3) * 86400_000).toISOString();
    await sql`update decisions set status = 'snoozed', snoozed_until = ${until}, updated_at = now() where id = ${params.id}`;
  }

  return NextResponse.json({ ok: true });
}
