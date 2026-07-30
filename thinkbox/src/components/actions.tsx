"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function run(input: RequestInfo, init?: RequestInit): Promise<Response | null> {
    setError(null);
    try {
      const res = await fetch(input, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Request failed (${res.status})`);
        return null;
      }
      start(() => router.refresh());
      return res;
    } catch {
      setError("Network error");
      return null;
    }
  }
  return { run, pending, error };
}

export function Btn({
  children,
  onClick,
  kind = "ghost",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    primary: "bg-accent text-white hover:opacity-90",
    ghost: "bg-transparent text-muted hover:text-ink hover:bg-hairline/40",
    danger: "bg-transparent text-rose hover:bg-roseSoft",
  }[kind];
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}
