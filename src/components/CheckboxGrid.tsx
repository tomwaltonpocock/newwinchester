"use client";

export function CheckboxGrid({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const checked = value.includes(opt);
        return (
          <label
            key={opt}
            className={[
              "flex items-start gap-3 p-3 border rounded cursor-pointer",
              checked ? "border-ink bg-stone-50" : "border-stone-200 bg-white",
            ].join(" ")}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={() => toggle(opt)}
            />
            <span className="text-sm">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}
