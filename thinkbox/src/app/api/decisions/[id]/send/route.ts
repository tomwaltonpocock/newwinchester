import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getThreadMessages, sendMessage, createGmailDraft } from "@/lib/gmail";
import { getAccount } from "@/lib/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  mode: z.enum(["send", "gmail_draft"]),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const account = await getAccount();
  if (!account) return NextResponse.json({ error: "not connected" }, { status: 400 });

  const rows = await sql`select * from decisions where id = ${params.id}`;
  const d = rows[0];
  if (!d) return NextResponse.json({ error: "not found" }, { status: 404 });

  const thread = await getThreadMessages(d.thread_id);
  const last = thread.at(-1);
  if (!last) return NextResponse.json({ error: "thread empty" }, { status: 400 });

  // reply to the last message not from us
  const target = [...thread].reverse().find((m) => m.from.email !== account.email) ?? last;
  const to = target.from.email;
  const cc = target.cc
    .concat(target.to)
    .map((a) => a.email)
    .filter((e) => e !== account.email && e !== to)
    .join(", ");

  const common = {
    to,
    cc: cc || undefined,
    subject: parsed.data.subject,
    body: parsed.data.body,
    threadId: d.thread_id,
    inReplyTo: target.messageIdHeader,
    references: [target.referencesHeader, target.messageIdHeader].filter(Boolean).join(" ") || null,
  };

  if (parsed.data.mode === "send") {
    await sendMessage(common);
    await sql`update decisions set status = 'done', decided_at = now(), updated_at = now() where id = ${params.id}`;
    return NextResponse.json({ ok: true, sent: true });
  } else {
    const draftId = await createGmailDraft(common);
    await sql`update decisions set gmail_draft_id = ${draftId}, updated_at = now() where id = ${params.id}`;
    return NextResponse.json({ ok: true, gmailDraftId: draftId });
  }
}
