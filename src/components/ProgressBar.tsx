export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="my-6">
      <div className="flex justify-between text-xs text-stone-600 mb-2">
        <span>Step {step} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-1.5 bg-stone-100 rounded overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
      >
        <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
