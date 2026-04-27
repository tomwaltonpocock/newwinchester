"use client";
import { useEffect, useRef, useState } from "react";
import type { Recipient } from "@/content/recipients";
import { Turnstile } from "./Turnstile";

const PARTICIPANT_KEY = "vfw:participant:v1";

function readParticipantToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PARTICIPANT_KEY);
}

export function RecipientMessageModal({
  recipient,
  turnstileSiteKey,
  onClose,
}: {
  recipient: Recipient;
  turnstileSiteKey: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipients/${encodeURIComponent(recipient.id)}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          email: email || null,
          message,
          honeypot,
          turnstileToken: token,
          participantToken: readParticipantToken(),
        }),
      });
      if (res.ok) setDone(true);
      else {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) || "submit_failed");
      }
    } catch {
      setError("network_error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Send a message to ${recipient.name}`}
      className="modal-shell"
      onClick={onClose}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={recipient.imagePath} alt={recipient.name} className="modal-avatar" />
          <div>
            <div className="font-serif text-lg font-semibold">{recipient.name}</div>
            <div className="text-xs text-stone-600">{recipient.role} · {recipient.organisation}</div>
          </div>
        </div>

        <p className="text-sm text-stone-700 mt-4">
          Your message will be sent via the platform. We screen messages before forwarding.
          If you give an email address, replies will go directly to you.
        </p>

        {done ? (
          <p className="mt-4 text-stone-700">
            Thanks — your message has been received and is being reviewed.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <label className="label" htmlFor="rm-name">Your name (optional)</label>
            <input
              id="rm-name"
              type="text"
              className="input"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 120))}
            />

            <label className="label mt-3" htmlFor="rm-email">Email (so they can reply directly)</label>
            <input
              id="rm-email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 254))}
              placeholder="you@example.com"
            />

            <label className="label mt-3" htmlFor="rm-message">Message</label>
            <textarea
              id="rm-message"
              className="textarea"
              required
              minLength={20}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              placeholder="Be civil and specific. Constructive feedback is most likely to land."
            />
            <p className="helper">{message.length}/2000 — minimum 20 characters</p>

            <div aria-hidden="true" style={{ position: "absolute", left: -10000, top: "auto" }}>
              <label>Leave blank<input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
            </div>

            {turnstileSiteKey && (
              <div className="mt-3">
                <Turnstile sitekey={turnstileSiteKey} onToken={setToken} />
              </div>
            )}

            {error && <p className="error mt-2">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={busy || message.trim().length < 20}>
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .modal-shell {
          position: fixed;
          inset: 0;
          background: rgba(31, 24, 18, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
          animation: vfwFadeIn 200ms ease-out both;
        }
        .modal-card {
          position: relative;
          background: white;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 8px;
          padding: 22px 22px 24px;
          box-shadow: 0 12px 40px rgba(31, 24, 18, 0.30);
          animation: vfwFadeUp 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .modal-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 36px;
          height: 36px;
          border: 0;
          background: transparent;
          color: #4f3f29;
          font-size: 24px;
          cursor: pointer;
          border-radius: 999px;
          line-height: 1;
        }
        .modal-close:hover { background: #f6f1e8; }
        .modal-avatar {
          width: 56px;
          height: 56px;
          border-radius: 999px;
          object-fit: cover;
          background: #ece4d4;
        }
        @media (prefers-reduced-motion: reduce) {
          .modal-shell, .modal-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
