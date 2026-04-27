"use client";

export function ConsentPanel({
  label,
  checked,
  onChange,
  required = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 mt-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
        required={required}
      />
      <span className="text-sm text-stone-700">{label}</span>
    </label>
  );
}
