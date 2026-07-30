"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VoiceButton({ built }: { built: boolean }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setNote(null);
          try {
            const res = await fetch("/api/voice", { method: "POST" });
            const j = await res.json();
            setNote(j.ok ? `Analysed ${j.samples} emails.` : j.error ?? "Failed");
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? "Reading your sent mail…" : built ? "Rebuild voice profile" : "Build voice profile"}
      </button>
      {note && <span className="text-xs text-muted">{note}</span>}
    </span>
  );
}
