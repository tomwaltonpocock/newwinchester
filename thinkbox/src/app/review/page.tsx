import { sql } from "@/lib/db";
import { ReviewTools, PriorityList, StatGrid } from "@/components/Review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const reviews = await sql`select * from weekly_reviews order by week_start desc limit 1`;
  const latest = reviews[0];
  const priorities = await sql`select id, content, period from priorities where active = true order by created_at`;
  const prefs = await sql`select stat_key, kept from stat_prefs`;

  const hidden = new Set(prefs.filter((p) => !p.kept).map((p) => p.stat_key));
  const stats = latest
    ? Object.values(latest.stats as Record<string, { key: string; label: string; value: string; detail?: string }>).filter(
        (s) => !hidden.has(s.key)
      )
    : [];

  return (
    <main>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-serif text-2xl">Review</h1>
          <p className="text-sm text-muted">
            {latest
              ? `Week beginning ${new Date(latest.week_start).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
              : "No review built yet."}
          </p>
        </div>
        <ReviewTools />
      </div>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Strategic priorities</h2>
        <PriorityList priorities={priorities.map((p) => ({ id: p.id, content: p.content, period: p.period }))} />
      </section>

      {latest?.narrative && (
        <section className="mb-8 rounded-xl border border-hairline/60 bg-card p-5 shadow-card">
          <p className="whitespace-pre-wrap font-serif leading-relaxed">{latest.narrative}</p>
        </section>
      )}

      <StatGrid stats={stats} />
    </main>
  );
}
