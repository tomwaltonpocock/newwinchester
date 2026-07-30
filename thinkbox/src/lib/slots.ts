// Compute proposable meeting slots from busy blocks. Pure, unit-testable.
import type { BusyBlock } from "./calendar";

export type Slot = { start: Date; end: Date };

export function computeFreeSlots(opts: {
  busy: BusyBlock[];
  days?: number;
  slotMinutes?: number;
  dayStartHour?: number;  // local hours
  dayEndHour?: number;
  now?: Date;
}): Slot[] {
  const days = opts.days ?? 10;
  const slotMs = (opts.slotMinutes ?? 30) * 60_000;
  const startHour = opts.dayStartHour ?? 9;
  const endHour = opts.dayEndHour ?? 18;
  const now = opts.now ?? new Date();
  const busy = opts.busy
    .map((b) => ({ s: new Date(b.start).getTime(), e: new Date(b.end).getTime() }))
    .sort((a, b) => a.s - b.s);

  const slots: Slot[] = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // weekdays only
    for (let h = startHour; h < endHour; h++) {
      for (let half = 0; half < 60 / (opts.slotMinutes ?? 30); half++) {
        const s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, half * (opts.slotMinutes ?? 30));
        const e = new Date(s.getTime() + slotMs);
        if (s.getTime() < now.getTime() + 3600_000) continue; // ≥1h notice
        const clash = busy.some((b) => b.s < e.getTime() && b.e > s.getTime());
        if (!clash) slots.push({ start: s, end: e });
      }
    }
  }
  return slots;
}

/** Human phrasing for a chosen set of slots, grouped by day. */
export function describeSlots(slots: Slot[], timezone: string): string {
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: timezone });
  const fmtTime = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", timeZone: timezone });
  const byDay = new Map<string, Slot[]>();
  for (const s of [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const k = fmtDay.format(s.start);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  return [...byDay.entries()]
    .map(([day, ss]) => `${day}: ${ss.map((s) => `${fmtTime.format(s.start)}–${fmtTime.format(s.end)}`).join(", ")}`)
    .join("\n");
}
