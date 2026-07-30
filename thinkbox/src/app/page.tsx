import Link from "next/link";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/google";
import { DecisionCard, DecisionRow } from "@/components/DecisionCard";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  let account = null;
  try {
    account = await getAccount();
  } catch {
    // env not configured yet
  }

  if (!account) {
    return (
      <main className="mt-16 text-center">
        <h1 className="font-serif text-3xl mb-3">Your inbox, one level up.</h1>
        <p className="text-muted mb-8 max-w-md mx-auto">
          Thinkbox reads your Gmail so you don&apos;t have to — surfacing the decisions, keeping your
          relationships warm, and setting the noise aside.
        </p>
        <Link href="/settings" className="rounded-lg bg-accent text-white px-5 py-2.5">
          Set up
        </Link>
      </main>
    );
  }

  const supa = db();
  const { data: open } = await supa
    .from("decisions")
    .select("*, threads(subject, participants, last_message_at)")
    .in("status", ["open", "drafted"])
    .order("effective_rank", { ascending: false })
    .limit(30);

  // wake snoozed cards whose time has come
  await supa.from("decisions").update({ status: "open" }).eq("status", "snoozed").lte("snoozed_until", new Date().toISOString());

  const { data: signals } = await supa
    .from("noise_log")
    .select("signal_note, received_at")
    .eq("is_signal", true)
    .order("received_at", { ascending: false })
    .limit(5);

  const rows: DecisionRow[] = (open ?? []).map((d) => {
    const participants = (d.threads?.participants ?? []) as { name: string; email: string }[];
    const sender = participants[0];
    return {
      id: d.id,
      title: d.title,
      summary: d.summary,
      magnitude: d.magnitude,
      kind: d.kind,
      status: d.status,
      needs_reply_by: d.needs_reply_by,
      travel_note: d.travel_note,
      sender: sender ? sender.name || sender.email : undefined,
      last_message_at: d.threads?.last_message_at,
    };
  });

  return (
    <main>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted text-sm">
          {rows.length === 0 ? "Nothing needs deciding." : `${rows.length} decision${rows.length === 1 ? "" : "s"} waiting.`}
        </p>
        <SyncButton />
      </div>

      {signals && signals.length > 0 && (
        <div className="mb-4 rounded-xl border border-hairline/60 bg-accentSoft/40 p-3 text-sm">
          {signals.map((s, i) => (
            <p key={i} className="text-accent">
              ◆ {s.signal_note}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((d) => (
          <DecisionCard key={d.id} d={d} />
        ))}
      </div>

      {rows.length === 0 && (
        <div className="mt-20 text-center text-muted">
          <p className="font-serif text-xl mb-2">All clear.</p>
          <p className="text-sm">New decisions appear here as mail arrives.</p>
        </div>
      )}
    </main>
  );
}
