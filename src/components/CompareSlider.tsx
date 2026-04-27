"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Before/after comparison slider. The "before" (developer) image sits
 * underneath; the "after" (alternative) image is layered on top and clipped
 * with `clip-path: inset(...)` so the visible portion follows the handle.
 *
 * Pointer + touch + keyboard accessible. Double-click resets to centre.
 */
export function CompareSlider({
  beforeSrc,
  beforeAlt,
  afterSrc,
  afterAlt,
}: {
  beforeSrc: string;
  beforeAlt: string;
  afterSrc: string;
  afterAlt: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(50);
  const draggingRef = useRef(false);

  const setFromX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const next = ((clientX - r.left) / r.width) * 100;
    setPct(Math.max(0, Math.min(100, next)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      setFromX(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [setFromX]);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    setFromX(e.clientX);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPct((p) => Math.max(0, p - 5));
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setPct((p) => Math.min(100, p + 5));
    }
  };

  return (
    <div
      ref={ref}
      className="compare-slider"
      onPointerDown={onPointerDown}
      onDoubleClick={() => setPct(50)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="layer" src={beforeSrc} alt={beforeAlt} draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="layer after"
        src={afterSrc}
        alt={afterAlt}
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      />

      <div
        className="handle"
        style={{ left: `${pct}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Drag to compare current and alternative"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        onKeyDown={onKeyDown}
      >
        <div className="grip" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9 6l-4 6 4 6" />
            <path d="M15 6l4 6-4 6" />
          </svg>
        </div>
      </div>

      <span className="pill pill-l">Current</span>
      <span className="pill pill-r">Alternative</span>

      <style jsx>{`
        .compare-slider {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: #ece4d4;
          overflow: hidden;
          border-radius: 6px;
          border: 1px solid #dccfb4;
          touch-action: none;
          user-select: none;
          cursor: ew-resize;
        }
        .layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .after {
          transition: clip-path 60ms linear;
        }
        .handle {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 0 0 1px rgba(31, 24, 18, 0.25);
          transform: translateX(-1px);
          outline: none;
        }
        .handle:focus-visible .grip {
          box-shadow: 0 0 0 3px #7a3d2e;
        }
        .grip {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: white;
          color: #1f1812;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(31, 24, 18, 0.2), 0 0 0 1px rgba(31, 24, 18, 0.12);
          transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .compare-slider:hover .grip {
          transform: translate(-50%, -50%) scale(1.06);
        }
        .pill {
          position: absolute;
          top: 8px;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #1f1812;
          background: rgba(255, 255, 255, 0.92);
          padding: 4px 8px;
          border-radius: 4px;
          pointer-events: none;
        }
        .pill-l { left: 8px; }
        .pill-r { right: 8px; }

        @media (prefers-reduced-motion: reduce) {
          .after { transition: none; }
          .grip { transition: none; }
          .compare-slider:hover .grip { transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
}
