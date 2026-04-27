"use client";
import { useState } from "react";
import { siteCopy } from "@/content/siteCopy";
import { Turnstile } from "./Turnstile";

export function ContactForm({
  categories,
  turnstileSiteKey,
}: {
  categories: readonly string[];
  turnstileSiteKey: string;
}) {
  const [category, setCategory] = useState(categories[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          name: name || null,
          email: email || null,
          message,
          honeypot,
          turnstileToken: token,
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

  if (done) {
    return <p className="text-stone-700">{siteCopy.contact.success}</p>;
  }

  return (
    <form onSubmit={submit}>
      <label className="label" htmlFor="category">Category</label>
      <select
        id="category"
        className="select"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <label className="label mt-4" htmlFor="contact-name">{siteCopy.contact.nameLabel}</label>
      <input
        id="contact-name"
        type="text"
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 120))}
        autoComplete="name"
      />

      <label className="label mt-4" htmlFor="contact-email">{siteCopy.contact.emailLabel}</label>
      <input
        id="contact-email"
        type="email"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value.slice(0, 254))}
        autoComplete="email"
      />

      <label className="label mt-4" htmlFor="contact-message">{siteCopy.contact.messageLabel}</label>
      <textarea
        id="contact-message"
        className="textarea"
        value={message}
        required
        maxLength={2000}
        onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
      />
      <p className="helper">{message.length}/2000</p>

      {/* Honeypot */}
      <div aria-hidden="true" style={{ position: "absolute", left: -10000, top: "auto" }}>
        <label>Leave blank<input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
      </div>

      {turnstileSiteKey && (
        <div className="mt-3">
          <Turnstile sitekey={turnstileSiteKey} onToken={setToken} />
        </div>
      )}

      {error && <p className="error mt-2">{error}</p>}

      <button type="submit" className="btn mt-4" disabled={busy || message.trim().length === 0}>
        {busy ? "Sending…" : siteCopy.contact.submit}
      </button>
    </form>
  );
}
