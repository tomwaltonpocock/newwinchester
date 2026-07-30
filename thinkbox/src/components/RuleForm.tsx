"use client";

import { useState } from "react";
import { useAction, Btn } from "./actions";

export function RuleForm({ rules }: { rules: { pattern: string; rule: string; note: string | null }[] }) {
  const { run, error } = useAction();
  const [pattern, setPattern] = useState("");
  const [rule, setRule] = useState<"noise" | "never_noise" | "signal">("noise");

  const labels: Record<string, string> = {
    noise: "always noise",
    never_noise: "never noise",
    signal: "extract signal",
  };

  return (
    <div>
      <div className="space-y-1.5 mb-3">
        {rules.map((r) => (
          <div key={r.pattern} className="flex items-center gap-2 text-sm rounded-lg border border-hairline/60 bg-card px-3 py-1.5">
            <span className="font-mono text-xs">{r.pattern}</span>
            <span className="text-xs text-muted">{labels[r.rule] ?? r.rule}</span>
            <span className="flex-1" />
            <Btn kind="danger" onClick={() => run("/api/rules", { method: "DELETE", body: JSON.stringify({ pattern: r.pattern }) })}>
              ✕
            </Btn>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="sender@example.com or @docsend.com"
          className="flex-1 rounded-lg border border-hairline bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          value={rule}
          onChange={(e) => setRule(e.target.value as typeof rule)}
          className="rounded-lg border border-hairline bg-paper px-2 text-sm"
        >
          <option value="noise">always noise</option>
          <option value="never_noise">never noise</option>
          <option value="signal">extract signal</option>
        </select>
        <Btn
          kind="primary"
          onClick={() => {
            if (!pattern.trim()) return;
            run("/api/rules", { method: "POST", body: JSON.stringify({ pattern: pattern.trim(), rule }) });
            setPattern("");
          }}
        >
          Add
        </Btn>
      </div>
      {error && <p className="mt-1 text-xs text-rose">{error}</p>}
    </div>
  );
}
