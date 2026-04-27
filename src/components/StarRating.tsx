"use client";
import { useState } from "react";

/**
 * Five-star rating with gentle scale-and-fill animation.
 * Tap a star to set the rating; tap the same star to clear.
 * Honours `prefers-reduced-motion` automatically via CSS.
 */
export function StarRating({
  label,
  value,
  onChange,
  size = 28,
}: {
  label?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div
      className="flex items-center gap-3 select-none"
      onMouseLeave={() => setHover(null)}
    >
      {label && <span className="text-sm w-24 shrink-0 text-stone-700">{label}</span>}
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label={label ?? "Rating"}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= display;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(n)}
              onFocus={() => setHover(n)}
              onBlur={() => setHover(null)}
              onClick={() => onChange(value === n ? null : n)}
              className="star-btn"
              style={{ width: size + 8, height: size + 8 }}
            >
              <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                aria-hidden="true"
                className={["star-svg", active ? "star-svg-active" : ""].join(" ")}
              >
                <path
                  d="M12 2.6l2.95 6.34 6.95.74-5.21 4.74 1.49 6.83L12 17.78l-6.18 3.47L7.31 14.42 2.1 9.68l6.95-.74L12 2.6z"
                  fill={active ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .star-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          padding: 0;
          color: #a78d62;
          cursor: pointer;
          border-radius: 999px;
          transition: transform 140ms ease, color 140ms ease, background 140ms ease;
        }
        .star-btn:hover,
        .star-btn:focus-visible {
          color: #7a3d2e;
          transform: scale(1.12);
          outline: none;
          background: rgba(167, 141, 98, 0.08);
        }
        .star-btn:active {
          transform: scale(1.02);
        }
        .star-svg {
          transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), filter 220ms ease;
        }
        .star-svg-active {
          filter: drop-shadow(0 1px 0 rgba(31, 24, 18, 0.08));
          animation: pop 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes pop {
          0% { transform: scale(0.85); }
          60% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .star-btn { transition: color 80ms ease; transform: none !important; }
          .star-svg-active { animation: none; }
          .star-svg { transition: none; }
        }
      `}</style>
    </div>
  );
}
