import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getThreadMessages } from "@/lib/gmail";
import { getAccount } from "@/lib/google";
import { draftReply } from "@/lib/voice";
import { describeSlots } from "@/lib/slots";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  direction: z.string().max(500).optional(),
  slots: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "not connected" }, { status: 400 });

  const rows = await sql`select * from decisions where id = ${params.id}`;
  const d = rows[0];
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });

  const thread = await getThreadMessages(d.thread_id);
  const slotsText = body.data.slots?.length
    ? describeSlots(body.data.slots.map((s) => ({ start: new Date(s.start), end: new Date(s.end) })), env.timezone())
    : undefined;

  const draft = await draftReply({
    threadContext: thread,
    ownerEmail: account.email,
    decisionTitle: d.title,
    direction: body.data.direction,
    slotsText,
    travelNote: d.travel_note ?? undefined,
  });

  await sql`update decisions set draft_subject = ${draft.subject}, draft_body = ${draft.body}, status = 'drafted', updated_at = now() where id = ${params.id}`;

  return NextResponse.json({ ok: true, ...draft });
}
