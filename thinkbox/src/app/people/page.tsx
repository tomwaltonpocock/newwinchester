import { sql, Row } from "@/lib/db";
import { PersonRow, PersonData } from "@/components/PersonRow";
import { IndexButton } from "@/components/IndexButton";

export const dynamic = "force-dynamic";

function toPerson(c: Row): PersonData {
  const last = [c.last_inbound_at, c.last_outbound_at]
    .filter(Boolean)
    .map((x) => new Date(x as string).toISOString())
    .sort()
    .at(-1);
  return {
    email: c.email,
    name: c.name ?? null,
    warmth: c.warmth ?? 0,
    is_power: !!c.is_power,
    median_gap_days: c.median_gap_days ?? null,
    target_cadence_days: c.target_cadence_days ?? null,
    tone_summary: c.tone_summary ?? null,
    notes: c.notes ?? null,
    last_contact: last ?? null,
  };
}

export default async function PeoplePage() {
  const power = await sql`select * from contacts where is_power = true order by warmth asc nulls first`;
  const rest = await sql`
    select * from contacts where is_power = false and do_not_track = false
    order by outbound_count desc limit 60`;

  const powerRows = power.map(toPerson);
  const restRows = rest.map(toPerson);
  const aging = powerRows.filter((p) => p.warmth < 45);

  return (
    <main>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-2xl">Power list</h1>
          <p className="text-sm text-muted">
            {powerRows.length === 0
              ? "Pin the people you most want to keep warm."
              : aging.length
                ? `${aging.length} relationship${aging.length === 1 ? "" : "s"} aging — coldest first.`
                : "Everyone is warm."}
          </p>
        </div>
        <IndexButton />
      </div>

      <div className="space-y-2">
        {powerRows.map((p) => (
          <PersonRow key={p.email} p={p} />
        ))}
      </div>

      <h2 className="font-serif text-xl mt-10 mb-3">Everyone else</h2>
      <p className="text-sm text-muted mb-3">Indexed from your mailbox, most-written-to first. Pin the ones that matter.</p>
      <div className="space-y-2">
        {restRows.map((p) => (
          <PersonRow key={p.email} p={p} />
        ))}
        {restRows.length === 0 && (
          <p className="text-sm text-muted">Nothing indexed yet — run “Index mailbox”.</p>
        )}
      </div>
    </main>
  );
}
