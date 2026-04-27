"use client";
import { siteCopy } from "@/content/siteCopy";

type Rating = 1 | 2 | 3 | 4 | 5 | null;

export function RatingGroup({
  question,
  value,
  onChange,
  name,
}: {
  question: string;
  value: Rating;
  onChange: (v: Rating) => void;
  name: string;
}) {
  return (
    <fieldset className="my-6">
      <legend className="label">{question}</legend>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(n as Rating)}
              className={["btn", active ? "" : "btn-secondary"].join(" ")}
            >
              {n}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={value === null && value !== undefined}
          onClick={() => onChange(null)}
          className={["btn col-span-3 sm:col-span-1", value === null ? "" : "btn-secondary"].join(" ")}
        >
          {siteCopy.overall.notSure}
        </button>
      </div>
      <input type="hidden" name={name} value={value ?? ""} />
    </fieldset>
  );
}
