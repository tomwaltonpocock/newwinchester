"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, Btn } from "./actions";

export function ReviewTools() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/review", { method: "POST" });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-lg border border-hairline bg-card px-3 py-1.5 text-sm text-muted hover:text-ink disabled:opacity-50"
    >
      {busy ? "Reflecting…" : "Build this week's review"}
    </button>
  );
}

export function PriorityList({ priorities }: { priorities: { id: string; content: string; period: string }[] }) {
  const { run } = useAction();
  const [text, setText] = useState("");
  const [period, setPeriod] = useState<"week" | "month">("week");
  return (
    <div className="space-y-2">
      {priorities.map((p) => (
        <div key={p.id} className="flex items-center gap-2 rounded-xl border border-hairline/60 bg-card px-3 py-2">
          <span className="text-xs uppercase text-muted w-12">{p.period}</span>
          <span className="flex-1 text-sm">{p.content}</span>
          <Btn kind="danger" onClick={() => run("/api/priorities", { method: "DELETE", body: JSON.stringify({ id: p.id }) })}>
            ✕
          </Btn>
        </div>
      ))}
      <div className="flex gap-2">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as "week" | "month")}
          className="rounded-lg border border-hairline bg-paper px-2 text-sm"
        >
          <option value="week">week</option>
          <option value="month">month</option>
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Set a priority, e.g. 'Close the fund's first two LPs'"
          className="flex-1 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <Btn
          kind="primary"
          onClick={() => {
            if (!text.trim()) return;
            run("/api/priorities", { method: "POST", body: JSON.stringify({ content: text.trim(), period }) });
            setText("");
          }}
        >
          Add
        </Btn>
      </div>
    </div>
  );
}

export function StatGrid({ stats }: { stats: { key: string; label: string; value: string; detail?: string }[] }) {
  const { run } = useAction();
  const [prompt, setPrompt] = useState("");
  const [custom, setCustom] = useState<{ key: string; label: string; value: string; detail?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(keep: boolean) {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/stats/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), keep }),
      });
      const j = await res.json();
      if (j.ok) setCustom(j.stat);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Your dashboard</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.key} className="group relative rounded-xl border border-hairline/60 bg-card p-4">
            <p className="text-2xl font-serif">{s.value}</p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
            {s.detail && <p className="text-xs text-muted/80 mt-1 leading-snug">{s.detail}</p>}
            <button
              type="button"
              title="Hide this stat from future weeks"
              onClick={() => run("/api/stats/prefs", { method: "PATCH", body: JSON.stringify({ stat_key: s.key, kept: false }) })}
              className="absolute top-2 right-2 hidden group-hover:block text-muted hover:text-rose text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        {custom && (
          <div className="rounded-xl border border-accent/40 bg-accentSoft/40 p-4">
            <p className="text-2xl font-serif">{custom.value}</p>
            <p className="text-xs text-muted mt-1">{custom.label}</p>
            {custom.detail && <p className="text-xs text-muted/80 mt-1">{custom.detail}</p>}
          </div>
        )}
      </div>
      {stats.length === 0 && !custom && <p className="text-sm text-muted">Stats appear after the first weekly review is built.</p>}
      <div className="mt-4 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask for a stat, e.g. 'how many intros did I make this week?'"
          className="flex-1 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <Btn kind="primary" onClick={() => ask(false)} disabled={busy}>
          {busy ? "Computing…" : "Compute"}
        </Btn>
        <Btn onClick={() => ask(true)} disabled={busy} title="Compute and keep on the dashboard">
          Keep
        </Btn>
      </div>
    </section>
  );
}
