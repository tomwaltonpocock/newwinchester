"use client";
import { useState } from "react";
import type { Aspect } from "@/content/aspects";
import { CompareSlider } from "./CompareSlider";
import { StarRating } from "./StarRating";
import { ImageModal } from "./ImageModal";

export type AspectStars = {
  developer: number | null;
  alt1: number | null;
  alt2: number | null;
  alt3: number | null;
};

type Mode = "slider" | "side";

export function AspectChooser({
  aspect,
  stars,
  onStarsChange,
  comment,
  onCommentChange,
}: {
  aspect: Aspect;
  stars: AspectStars;
  onStarsChange: (next: AspectStars) => void;
  comment: string;
  onCommentChange: (next: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("slider");
  const [selectedAlt, setSelectedAlt] = useState<1 | 2 | 3>(aspect.altIndices[0] ?? 1);
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  const developerSrc = aspect.paths[0];
  const developerAlt = aspect.developerAlt;

  const altSrc = aspect.paths[selectedAlt];
  const altAlt =
    aspect.altDescriptions[selectedAlt] ?? `Alternative ${selectedAlt} for aspect ${aspect.n}`;

  const hasAlts = aspect.altIndices.length > 0;
  const multipleAlts = aspect.altIndices.length > 1;

  const setStar = (key: keyof AspectStars) => (v: number | null) =>
    onStarsChange({ ...stars, [key]: v });

  return (
    <div>
      {/* View toggle (only if at least one alternative exists) */}
      {hasAlts && (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="seg" role="tablist" aria-label="Comparison view">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "slider"}
              className={mode === "slider" ? "seg-on" : ""}
              onClick={() => setMode("slider")}
            >
              Slider
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "side"}
              className={mode === "side" ? "seg-on" : ""}
              onClick={() => setMode("side")}
            >
              Side by side
            </button>
          </div>

          {multipleAlts && (
            <div className="alt-picker" role="tablist" aria-label="Which alternative">
              <span className="alt-picker-label">Alternative</span>
              {aspect.altIndices.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={selectedAlt === k}
                  className={selectedAlt === k ? "alt-on" : ""}
                  onClick={() => setSelectedAlt(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparison view */}
      {!hasAlts ? (
        <SingleImage src={developerSrc} alt={developerAlt} onZoom={() => setZoom({ src: developerSrc, alt: developerAlt })} />
      ) : mode === "slider" && altSrc ? (
        <CompareSlider
          beforeSrc={developerSrc}
          beforeAlt={developerAlt}
          afterSrc={altSrc}
          afterAlt={altAlt}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Tile
            label="Current"
            src={developerSrc}
            alt={developerAlt}
            onZoom={() => setZoom({ src: developerSrc, alt: developerAlt })}
          />
          {altSrc && (
            <Tile
              label={`Alternative ${selectedAlt}`}
              src={altSrc}
              alt={altAlt}
              onZoom={() => setZoom({ src: altSrc, alt: altAlt })}
            />
          )}
        </div>
      )}

      {aspect.whatToNotice.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-stone-700 underline">
            What to notice
          </summary>
          <ul className="mt-2 list-disc pl-5 text-sm text-stone-700 space-y-1">
            {aspect.whatToNotice.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </details>
      )}

      {/* Star ratings */}
      <div className="mt-6 space-y-3">
        <p className="text-xs uppercase tracking-widest text-stone-600">
          Rate each
        </p>
        <StarRating label="Current" value={stars.developer} onChange={setStar("developer")} />
        {aspect.altIndices.includes(1) && (
          <StarRating label="Alt 1" value={stars.alt1} onChange={setStar("alt1")} />
        )}
        {aspect.altIndices.includes(2) && (
          <StarRating label="Alt 2" value={stars.alt2} onChange={setStar("alt2")} />
        )}
        {aspect.altIndices.includes(3) && (
          <StarRating label="Alt 3" value={stars.alt3} onChange={setStar("alt3")} />
        )}
      </div>

      <div className="mt-5">
        <label className="label" htmlFor={`comment-${aspect.n}`}>
          Say why, if you want
        </label>
        <textarea
          id={`comment-${aspect.n}`}
          className="textarea"
          maxLength={900}
          placeholder="Optional"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value.slice(0, 900))}
        />
        <p className="helper">{comment.length}/900</p>
      </div>

      {zoom && <ImageModal src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}

      <style jsx>{`
        .seg {
          display: inline-flex;
          background: #f6f1e8;
          border: 1px solid #dccfb4;
          border-radius: 999px;
          padding: 3px;
        }
        .seg button {
          padding: 6px 12px;
          font-size: 13px;
          border-radius: 999px;
          background: transparent;
          color: #4f3f29;
          border: 0;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
        }
        .seg button.seg-on {
          background: #1f1812;
          color: #fbf8f3;
        }
        .alt-picker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        .alt-picker-label {
          color: #6a5538;
          margin-right: 2px;
        }
        .alt-picker button {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid #dccfb4;
          background: white;
          color: #4f3f29;
          cursor: pointer;
          font-weight: 600;
          transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
        }
        .alt-picker button.alt-on {
          background: #1f1812;
          color: #fbf8f3;
          border-color: #1f1812;
        }
      `}</style>
    </div>
  );
}

function Tile({
  label,
  src,
  alt,
  onZoom,
}: {
  label: string;
  src: string;
  alt: string;
  onZoom: () => void;
}) {
  return (
    <figure>
      <button
        type="button"
        onClick={onZoom}
        className="block w-full overflow-hidden rounded border border-stone-200 bg-stone-50"
        aria-label={`Tap to enlarge: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-auto block aspect-[4/3] object-cover" />
      </button>
      <figcaption className="mt-2 text-sm font-semibold">{label}</figcaption>
    </figure>
  );
}

function SingleImage({
  src,
  alt,
  onZoom,
}: {
  src: string;
  alt: string;
  onZoom: () => void;
}) {
  return (
    <figure>
      <button
        type="button"
        onClick={onZoom}
        className="block w-full overflow-hidden rounded border border-stone-200 bg-stone-50"
        aria-label={`Tap to enlarge: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-auto block aspect-[4/3] object-cover" />
      </button>
      <figcaption className="mt-2 text-sm font-semibold">Current proposal</figcaption>
      <p className="mt-2 text-sm text-stone-600">No alternatives uploaded for this aspect yet.</p>
    </figure>
  );
}
