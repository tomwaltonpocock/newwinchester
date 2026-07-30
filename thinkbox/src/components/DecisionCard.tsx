"use client";

import Link from "next/link";
import { useAction, Btn } from "./actions";

export type DecisionRow = {
  id: string;
  title: string;
  summary: string | null;
  magnitude: number;
  kind: string;
  status: string;
  needs_reply_by: string | null;
  travel_note: string | null;
  thread_subject?: string;
  sender?: string;
  last_message_at?: string;
};

function MagnitudeDots({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`Magnitude ${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= n ? "bg-accent" : "bg-hairline"}`} />
      ))}
    </span>
  );
}

export function DecisionCard({ d }: { d: DecisionRow }) {
  const { run, error } = useAction();
  const act = (action: string) =>
    run(`/api/decisions/${d.id}`, { method: "PATCH", body: JSON.stringify({ action }) });

  return (
    <div className="rounded-xl bg-card p-4 shadow-card border border-hairline/60">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/decisions/${d.id}`} className="block group flex-1">
          <div className="flex items-center gap-2 text-xs text-muted mb-1">
            <MagnitudeDots n={d.magnitude} />
            {d.kind === "scheduling" && <span className="text-accent">meeting</span>}
            {d.sender && <span>· {d.sender}</span>}
            {d.needs_reply_by && (
              <span className="text-amber">· by {new Date(d.needs_reply_by).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            )}
            {d.status === "drafted" && <span className="text-accent">· draft ready</span>}
          </div>
          <h3 className="font-serif text-lg leading-snug group-hover:underline decoration-hairline underline-offset-4">
            {d.title}
          </h3>
          {d.summary && <p className="mt-1 text-sm text-muted leading-relaxed">{d.summary}</p>}
          {d.travel_note && (
            <p className="mt-2 text-xs text-amber bg-amberSoft inline-block rounded px-2 py-1">✈ {d.travel_note}</p>
          )}
        </Link>
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <Btn onClick={() => act("up")} title="More important than shown">
            ▲
          </Btn>
          <Btn onClick={() => act("down")} title="Less important than shown">
            ▼
          </Btn>
        </div>
      </div>
      <div className="mt-3 flex gap-1 border-t border-hairline/60 pt-2">
        <Link
          href={`/decisions/${d.id}`}
          className="rounded-lg px-3 py-1.5 text-sm bg-accentSoft text-accent hover:opacity-80"
        >
          {d.kind === "scheduling" ? "Pick times" : "Draft reply"}
        </Link>
        <Btn onClick={() => act("done")}>Done</Btn>
        <Btn onClick={() => act("snooze")}>Snooze</Btn>
        <Btn onClick={() => act("dismiss")} kind="danger">
          Dismiss
        </Btn>
      </div>
      {error && <p className="mt-2 text-xs text-rose">{error}</p>}
    </div>
  );
}
