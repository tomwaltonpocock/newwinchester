"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: { sitekey: string; callback: (token: string) => void }
      ) => string;
      remove: (id: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function Turnstile({
  sitekey,
  onToken,
}: {
  sitekey: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!sitekey || !ref.current) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey,
        callback: (token: string) => onToken(token),
      });
    };

    if (!document.querySelector("script[data-turnstile]")) {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.dataset.turnstile = "1";
      s.onload = render;
      document.head.appendChild(s);
    } else {
      render();
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
    };
  }, [sitekey, onToken]);

  return <div ref={ref} aria-label="Bot protection" />;
}
