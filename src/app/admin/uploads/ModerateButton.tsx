"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModerateButton({
  id,
  status,
}: {
  id: string;
  status: "approved" | "rejected" | "pending";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary text-xs px-2 py-1 min-h-0"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch(`/api/admin/uploads/${id}/moderate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {status}
    </button>
  );
}
