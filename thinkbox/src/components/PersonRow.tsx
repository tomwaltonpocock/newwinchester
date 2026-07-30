"use client";

import { useState } from "react";
import { useAction, Btn } from "./actions";

export type PersonData = {
  email: string;
  name: string | null;
  warmth: number;
  is_power: boolean;
  median_gap_days: number | null;
  target_cadence_days: number | null;
  tone_summary: string | null;
  notes: string | null;
  last_contact: string | null;
};

function WarmthBar({ w }: { w: number }) {
  const color = w >= 60 ? "bg-accent" : w >= 45 ? "bg-amber" : "bg-rose";
  return (
    <div className="h-1.5 w-20 rounded-full bg-hairline overflow-hidden" title={`Warmth ${w}/100`}>
      <div className={`h-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function PersonRow({ p }: { p: PersonData }) {
  const { run, error } = useAction();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (body: Record<string, unknown>) =>
    run(`/api/people/${encodeURIComponent(p.email)}`, { method: "PATCH", body: JSON.stringify(body) });

  async function warm() {
    setBusy(true);
    setDraft(null);
    try {
      const res = await fetch(`/api/people/${encodeURIComponent(p.email)}/warm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (j.ok) setDraft({ subject: j.subject, body: j.body });
    } finally {
      setBusy(false);
    }
  }

  const lastContactStr = p.last_contact
    ? new Date(p.last_contact).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "never";

  return (
    <div className="rounded-xl border border-hairline/60 bg-card p-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(!open)} className="flex-1 text-left">
          <span className="text-sm font-medium">{p.name || p.email}</span>
          <span className="ml-2 text-xs text-muted">
            last {lastContactStr}
            {p.median_gap_days ? ` · usually every ~${Math.round(p.median_gap_days)}d` : ""}
          </span>
          {p.tone_summary && <span className="ml-2 text-xs text-accent">{p.tone_summary}</span>}
        </button>
        <WarmthBar w={p.warmth} />
        <Btn onClick={() => patch({ is_power: !p.is_power })} title={p.is_power ? "Remove from power list" : "Add to power list"}>
          {p.is_power ? "★" : "☆"}
        </Btn>
      </div>

      {open && (
        <div className="mt-3 border-t border-hairline/60 pt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Btn onClick={warm} kind="primary" disabled={busy}>
              {busy ? "Writing…" : "Draft keep-warm note"}
            </Btn>
            <Btn onClick={() => patch({ analyze_tone: true })}>Analyse tone</Btn>
            <Btn onClick={() => patch({ do_not_track: true })} kind="danger">
              Stop tracking
            </Btn>
          </div>
          <label className="block text-xs text-muted">
            Target cadence (days) — overrides the learned baseline
            <input
              type="number"
              defaultValue={p.target_cadence_days ?? ""}
              onBlur={(e) => patch({ target_cadence_days: e.target.value ? Number(e.target.value) : null })}
              className="mt-1 w-28 rounded-lg border border-hairline bg-paper px-2 py-1 text-sm block"
            />
          </label>
          <label className="block text-xs text-muted">
            Notes
            <textarea
              defaultValue={p.notes ?? ""}
              onBlur={(e) => patch({ notes: e.target.value || null })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-hairline bg-paper px-2 py-1 text-sm"
            />
          </label>
          {draft && (
            <div className="rounded-lg bg-accentSoft/50 p-3 text-sm">
              <p className="font-medium mb-1">{draft.subject}</p>
              <p className="whitespace-pre-wrap leading-relaxed">{draft.body}</p>
              <p className="mt-2 text-xs text-accent">Saved to your Gmail drafts — edit and send from there, or redraft.</p>
            </div>
          )}
          {error && <p className="text-xs text-rose">{error}</p>}
        </div>
      )}
    </div>
  );
}
