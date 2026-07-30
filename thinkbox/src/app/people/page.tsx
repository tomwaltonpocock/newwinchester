import { db } from "@/lib/supabase";
import { PersonRow, PersonData } from "@/components/PersonRow";
import { IndexButton } from "@/components/IndexButton";

export const dynamic = "force-dynamic";

function toPerson(c: Record<string, unknown>): PersonData {
  return {
    email: c.email as string,
    name: (c.name as string) ?? null,
    warmth: (c.warmth as number) ?? 0,
    is_power: !!c.is_power,
    median_gap_days: (c.median_gap_days as number) ?? null,
    target_cadence_days: (c.target_cadence_days as number) ?? null,
    tone_summary: (c.tone_summary as string) ?? null,
    notes: (c.notes as string) ?? null,
    last_contact: ([c.last_inbound_at, c.last_outbound_at].filter(Boolean).sort().at(-1) as string) ?? null,
  };
}

export default async function PeoplePage() {
  const supa = db();
  const { data: power } = await supa
    .from("contacts")
    .select("*")
    .eq("is_power", true)
    .order("warmth", { ascending: true });
  const { data: rest } = await supa
    .from("contacts")
    .select("*")
    .eq("is_power", false)
    .eq("do_not_track", false)
    .order("outbound_count", { ascending: false })
    .limit(60);

  const powerRows = (power ?? []).map(toPerson);
  const restRows = (rest ?? []).map(toPerson);
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
