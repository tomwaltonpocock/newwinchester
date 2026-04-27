export function AdminStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-stone-600">{label}</div>
      <div className="mt-2 text-3xl font-serif">{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-600">{hint}</div>}
    </div>
  );
}
