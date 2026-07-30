"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const router = useRouter();

  async function sync() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const j = await res.json();
      setNote(j.ok ? `${j.processed} new, ${j.decisions} decisions` : j.error ?? "Sync failed");
      router.refresh();
    } catch {
      setNote("Sync failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      {note && <span className="text-muted text-xs">{note}</span>}
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="rounded-lg border border-hairline bg-card px-3 py-1.5 text-muted hover:text-ink disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
    </span>
  );
}
