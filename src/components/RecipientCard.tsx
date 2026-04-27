"use client";
import { useState } from "react";
import type { Recipient } from "@/content/recipients";
import { RecipientMessageModal } from "./RecipientMessageModal";

export function RecipientCard({
  recipient,
  turnstileSiteKey,
}: {
  recipient: Recipient;
  turnstileSiteKey: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="recipient-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={recipient.imagePath}
          alt={`${recipient.name}, ${recipient.role}`}
          className="recipient-photo"
        />
        <div className="recipient-meta">
          <div className="recipient-name">{recipient.name}</div>
          <div className="recipient-role">{recipient.role}</div>
          <div className="recipient-org">{recipient.organisation}</div>
          <button type="button" className="btn mt-3" onClick={() => setOpen(true)}>
            Send a message
          </button>
        </div>
      </div>

      {open && (
        <RecipientMessageModal
          recipient={recipient}
          turnstileSiteKey={turnstileSiteKey}
          onClose={() => setOpen(false)}
        />
      )}

      <style jsx>{`
        .recipient-card {
          display: flex;
          gap: 14px;
          padding: 14px;
          background: white;
          border: 1px solid #dccfb4;
          border-radius: 8px;
          align-items: flex-start;
          transition: box-shadow 200ms ease, transform 200ms ease;
        }
        .recipient-card:hover {
          box-shadow: 0 6px 22px rgba(31, 24, 18, 0.10);
          transform: translateY(-1px);
        }
        .recipient-photo {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: 999px;
          flex-shrink: 0;
          background: #ece4d4;
        }
        .recipient-meta { min-width: 0; }
        .recipient-name {
          font-family: theme("fontFamily.serif");
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f1812;
        }
        .recipient-role { font-size: 0.85rem; color: #4f3f29; margin-top: 2px; }
        .recipient-org { font-size: 0.78rem; color: #6a5538; margin-top: 1px; }
        @media (prefers-reduced-motion: reduce) {
          .recipient-card { transition: none; }
          .recipient-card:hover { transform: none; }
        }
      `}</style>
    </>
  );
}
