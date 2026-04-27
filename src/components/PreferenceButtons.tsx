"use client";
import { siteCopy } from "@/content/siteCopy";

type Choice = "left" | "right" | "no_preference";

export function PreferenceButtons({
  value,
  onChange,
}: {
  value: Choice | null;
  onChange: (v: Choice) => void;
}) {
  const opts: { v: Choice; label: string }[] = [
    { v: "left", label: siteCopy.review.preferA },
    { v: "right", label: siteCopy.review.preferB },
    { v: "no_preference", label: siteCopy.review.noPreference },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 sticky bottom-2 bg-paper/90 backdrop-blur p-2 rounded">
      {opts.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={active}
            className={[
              "btn",
              active ? "" : "btn-secondary",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
