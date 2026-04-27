"use client";
import { useState } from "react";
import type { ImagePair } from "@/content/imagePairs";
import { siteCopy } from "@/content/siteCopy";
import { ImageModal } from "./ImageModal";

export type Side = "left" | "right";

export function ImageComparePair({
  pair,
  leftKind,
  rightKind,
  showSources,
}: {
  pair: ImagePair;
  leftKind: "developer" | "refined";
  rightKind: "developer" | "refined";
  showSources: boolean;
}) {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  const leftSrc = leftKind === "developer" ? pair.developerImage : pair.refinedImage;
  const rightSrc = rightKind === "developer" ? pair.developerImage : pair.refinedImage;
  const leftAlt = leftKind === "developer" ? pair.developerAlt : pair.refinedAlt;
  const rightAlt = rightKind === "developer" ? pair.developerAlt : pair.refinedAlt;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CompareTile
          label={siteCopy.review.optionA}
          src={leftSrc}
          alt={leftAlt}
          source={showSources ? leftKind : null}
          onZoom={() => setZoom({ src: leftSrc, alt: leftAlt })}
        />
        <CompareTile
          label={siteCopy.review.optionB}
          src={rightSrc}
          alt={rightAlt}
          source={showSources ? rightKind : null}
          onZoom={() => setZoom({ src: rightSrc, alt: rightAlt })}
        />
      </div>

      {pair.whatToNotice && pair.whatToNotice.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-stone-700 underline">
            What to notice
          </summary>
          <ul className="mt-2 list-disc pl-5 text-sm text-stone-700 space-y-1">
            {pair.whatToNotice.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </details>
      )}

      {zoom && <ImageModal src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </div>
  );
}

function CompareTile({
  label,
  src,
  alt,
  source,
  onZoom,
}: {
  label: string;
  src: string;
  alt: string;
  source: "developer" | "refined" | null;
  onZoom: () => void;
}) {
  return (
    <figure className="relative">
      <button
        type="button"
        onClick={onZoom}
        className="block w-full overflow-hidden rounded border border-stone-200 bg-stone-50"
        aria-label={`${siteCopy.review.tapToEnlarge}: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="eager"
          className="w-full h-auto block aspect-[4/3] object-cover"
        />
      </button>
      <figcaption className="mt-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        {source && (
          <span className="text-xs uppercase tracking-wide text-stone-600">
            {source}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
