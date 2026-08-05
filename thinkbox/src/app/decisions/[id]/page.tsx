import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { getThreadMessages } from "@/lib/gmail";
import { stripQuoted } from "@/lib/voice";
import { Workbench } from "@/components/Workbench";

export const dynamic = "force-dynamic";

export default async function DecisionDetail({ params }: { params: { id: string } }) {
  const rows = await sql`select * from decisions where id = ${params.id}`;
  const d = rows[0];
  if (!d) notFound();

  let thread: { from: string; date: string; body: string }[] = [];
  try {
    const msgs = await getThreadMessages(d.thread_id);
    thread = msgs.map((m) => ({
      from: m.from.name || m.from.email,
      date: m.date.toISOString(),
      body: stripQuoted(m.bodyText).slice(0, 3000),
    }));
  } catch {
    // Gmail unavailable; show what we have
  }

  return (
    <main>
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Decisions
      </Link>
      <h1 className="font-serif text-2xl mt-2 leading-snug">{d.title}</h1>
      {d.summary && <p className="text-muted mt-1">{d.summary}</p>}
      {d.travel_note && (
        <p className="mt-2 text-sm text-amber bg-amberSoft inline-block rounded px-2 py-1">✈ {d.travel_note}</p>
      )}

      <Workbench
        decision={{
          id: d.id,
          kind: d.kind,
          status: d.status,
          options: (d.options ?? []) as string[],
          draft_subject: d.draft_subject,
          draft_body: d.draft_body,
        }}
      />

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Thread</h2>
        <div className="space-y-3">
          {thread.length === 0 && <p className="text-sm text-muted">Thread unavailable.</p>}
          {thread.map((m, i) => (
            <div key={i} className="rounded-xl border border-hairline/60 bg-card p-3">
              <p className="text-xs text-muted mb-1">
                {m.from} · {new Date(m.date).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
