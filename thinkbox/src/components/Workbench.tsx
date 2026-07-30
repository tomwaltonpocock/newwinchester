"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Slot = { start: string; end: string };

export function Workbench({
  decision,
}: {
  decision: {
    id: string;
    kind: string;
    status: string;
    options: string[];
    draft_subject: string | null;
    draft_body: string | null;
  };
}) {
  const router = useRouter();
  const [direction, setDirection] = useState("");
  const [subject, setSubject] = useState(decision.draft_subject ?? "");
  const [body, setBody] = useState(decision.draft_body ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // slot picker state (scheduling decisions)
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<Slot[]>([]);
  const isScheduling = decision.kind === "scheduling";

  useEffect(() => {
    if (!isScheduling) return;
    fetch("/api/slots")
      .then((r) => r.json())
      .then((j) => j.ok && setSlots(j.slots))
      .catch(() => {});
  }, [isScheduling]);

  async function generate(dir?: string) {
    setBusy("draft");
    setNote(null);
    try {
      const res = await fetch(`/api/decisions/${decision.id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: dir ?? (direction || undefined), slots: picked.length ? picked : undefined }),
      });
      const j = await res.json();
      if (j.ok) {
        setSubject(j.subject);
        setBody(j.body);
      } else setNote(j.error ?? "Draft failed");
    } finally {
      setBusy(null);
    }
  }

  async function dispatch(mode: "send" | "gmail_draft") {
    if (!subject || !body) return;
    setBusy(mode);
    setNote(null);
    try {
      const res = await fetch(`/api/decisions/${decision.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, subject, body }),
      });
      const j = await res.json();
      if (j.ok) {
        setNote(mode === "send" ? "Sent." : "Saved to Gmail drafts.");
        if (mode === "send") setTimeout(() => router.push("/"), 600);
      } else setNote(j.error ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  // group slots by day for the picker
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const d = new Date(s.start);
    const key = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const togglePick = (s: Slot) =>
    setPicked((p) => (p.some((x) => x.start === s.start) ? p.filter((x) => x.start !== s.start) : [...p, s]));

  return (
    <section className="mt-6 rounded-xl border border-hairline/60 bg-card p-4 shadow-card">
      {isScheduling && (
        <div className="mb-4">
          <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Tap times to offer</h2>
          {slots.length === 0 && <p className="text-sm text-muted">Loading your free slots…</p>}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {[...byDay.entries()].map(([day, ss]) => (
              <div key={day}>
                <p className="text-xs text-muted mb-1">{day}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ss.map((s) => {
                    const sel = picked.some((x) => x.start === s.start);
                    return (
                      <button
                        key={s.start}
                        type="button"
                        onClick={() => togglePick(s)}
                        className={`rounded-lg px-2.5 py-1 text-xs border transition ${
                          sel ? "bg-accent text-white border-accent" : "bg-paper border-hairline text-ink hover:border-accent"
                        }`}
                      >
                        {new Date(s.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {picked.length > 0 && (
            <p className="mt-2 text-xs text-accent">{picked.length} slot{picked.length === 1 ? "" : "s"} selected — generate the reply below.</p>
          )}
        </div>
      )}

      {decision.options.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {decision.options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                setDirection(o);
                generate(o);
              }}
              className="rounded-lg border border-hairline bg-paper px-3 py-1.5 text-sm hover:border-accent"
            >
              {o}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="Steer the reply (optional): e.g. 'yes, but push to next month'"
          className="flex-1 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => generate()}
          disabled={busy === "draft"}
          className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy === "draft" ? "Writing…" : body ? "Redraft" : "Draft reply"}
        </button>
      </div>

      {(body || subject) && (
        <div className="mt-4 space-y-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={Math.min(16, Math.max(6, body.split("\n").length + 2))}
            className="w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch("send")}
              disabled={!!busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy === "send" ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => dispatch("gmail_draft")}
              disabled={!!busy}
              className="rounded-lg border border-hairline bg-paper px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy === "gmail_draft" ? "Saving…" : "Save to Gmail drafts"}
            </button>
          </div>
        </div>
      )}
      {note && <p className="mt-2 text-sm text-accent">{note}</p>}
    </section>
  );
}
