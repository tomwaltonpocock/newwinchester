"use client";
import { useState } from "react";

export function OptionalComment({
  label,
  placeholder = "",
  maxLength = 900,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  maxLength?: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(value.length > 0);
  if (!open) {
    return (
      <button
        type="button"
        className="mt-3 text-sm text-stone-700 underline"
        onClick={() => setOpen(true)}
      >
        + {label}
      </button>
    );
  }
  return (
    <div className="mt-3">
      <label className="label">{label}</label>
      <textarea
        className="textarea"
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
      />
      <p className="helper">{value.length}/{maxLength}</p>
    </div>
  );
}
