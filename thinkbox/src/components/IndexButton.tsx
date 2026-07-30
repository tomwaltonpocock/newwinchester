"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IndexButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/people", { method: "POST" });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-lg border border-hairline bg-card px-3 py-1.5 text-sm text-muted hover:text-ink disabled:opacity-50"
    >
      {busy ? "Indexing…" : "Index mailbox"}
    </button>
  );
}
