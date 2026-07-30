import { db } from "@/lib/supabase";
import { RuleForm } from "@/components/RuleForm";

export const dynamic = "force-dynamic";

export default async function NoisePage() {
  const supa = db();
  const { data: noiseRows } = await supa
    .from("noise_log")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(80);
  const { data: rules } = await supa.from("sender_rules").select("*").order("pattern");

  const signals = (noiseRows ?? []).filter((n) => n.is_signal);
  const junk = (noiseRows ?? []).filter((n) => !n.is_signal);

  return (
    <main>
      <h1 className="font-serif text-2xl mb-1">Noise</h1>
      <p className="text-sm text-muted mb-6">
        Set aside, never deleted. Everything here stays in Gmail under the Thinkbox/Noise label.
      </p>

      {signals.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Signals pulled from the noise</h2>
          <div className="space-y-1.5">
            {signals.map((s) => (
              <p key={s.message_id} className="text-sm rounded-lg bg-accentSoft/40 px-3 py-2 text-accent">
                ◆ {s.signal_note ?? s.subject}
                <span className="text-xs text-muted ml-2">
                  {s.received_at && new Date(s.received_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Sender rules</h2>
        <RuleForm rules={rules ?? []} />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Set aside ({junk.length})</h2>
        <div className="space-y-1">
          {junk.map((n) => (
            <div key={n.message_id} className="flex items-baseline gap-2 text-sm border-b border-hairline/40 py-1.5">
              <span className="text-muted text-xs w-36 truncate shrink-0">{n.from_email}</span>
              <span className="flex-1 truncate">{n.subject}</span>
              {n.reason && <span className="text-xs text-muted/70 shrink-0">{n.reason}</span>}
            </div>
          ))}
          {junk.length === 0 && <p className="text-sm text-muted">Nothing set aside yet.</p>}
        </div>
      </section>
    </main>
  );
}
