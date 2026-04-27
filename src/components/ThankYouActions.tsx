"use client";
import { useEffect, useState } from "react";
import { siteCopy } from "@/content/siteCopy";

export function ThankYouActions({
  publicToken,
  shareUrl,
  mailtoHref,
  siteUrl,
}: {
  publicToken: string;
  shareUrl: string | null;
  mailtoHref: string;
  siteUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "ok" | "err">("idle");

  const onMailto = async () => {
    try {
      await fetch("/api/mailto-clicked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken }),
      });
    } catch {}
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // No-frills late opt-in for users who didn't enter email earlier.
  // Reuses the contact endpoint with category "I can help" + a marker phrase
  // so admin can route into the subscriber list via subscriber export script.
  // Keeping it simple avoids a second public endpoint.
  const onSubscribe = async () => {
    setSubStatus("idle");
    if (!email.includes("@")) return;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "I can help",
          email,
          message: "[late opt-in] Please add me to update emails about Silver Hill / Vision for Winchester.",
          honeypot: "",
        }),
      });
      setSubStatus(res.ok ? "ok" : "err");
    } catch {
      setSubStatus("err");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card">
        <h3 className="font-serif">{siteCopy.thankYou.emailDecisionMakers.title}</h3>
        <p className="mt-2 text-sm text-stone-700">
          {siteCopy.thankYou.emailDecisionMakers.body}
        </p>
        <a href={mailtoHref} className="btn mt-4" onClick={onMailto}>
          {siteCopy.thankYou.emailDecisionMakers.button}
        </a>
      </div>

      <div className="card">
        <h3 className="font-serif">{siteCopy.thankYou.share.title}</h3>
        <p className="mt-2 text-sm text-stone-700">
          {siteCopy.thankYou.share.body}
        </p>
        <button type="button" className="btn btn-secondary mt-4" onClick={onCopy}>
          {copied ? "Link copied" : siteCopy.thankYou.share.copy}
        </button>
        {shareUrl && (
          <p className="mt-3 text-xs text-stone-600 break-all">
            Your share link: <a href={shareUrl}>{shareUrl}</a>
          </p>
        )}
      </div>

      <div className="card">
        <h3 className="font-serif">{siteCopy.thankYou.stayUpdated.title}</h3>
        <p className="mt-2 text-sm text-stone-700">{siteCopy.thankYou.stayUpdated.body}</p>
        <input
          type="email"
          className="input mt-3"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="button"
          className="btn mt-3"
          onClick={onSubscribe}
          disabled={!email.includes("@")}
        >
          {siteCopy.thankYou.stayUpdated.button}
        </button>
        {subStatus === "ok" && (
          <p className="helper mt-2">Thanks. We’ll be in touch with confirmation.</p>
        )}
        {subStatus === "err" && (
          <p className="error mt-2">Sorry — something went wrong. Try again later.</p>
        )}
      </div>
    </div>
  );
}
