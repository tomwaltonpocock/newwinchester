import { sql } from "./db";
import { env } from "./env";
import { listInboxMessages, listSentMessages, ensureLabel, labelMessage } from "./gmail";
import { getAccount } from "./google";
import { triageMessage, TriageResult } from "./triage";
import { effectiveRank } from "./rank";
import { upcomingTravel, travelOverlapping } from "./calendar";
import { medianGapDays, warmthScore } from "./warmth";

const LABELS = {
  noise: "Thinkbox/Noise",
  signal: "Thinkbox/Signal",
  decision: "Thinkbox/Decision",
};

/** Sender rules: exact email or '@domain' patterns. */
async function ruleFor(fromEmail: string): Promise<string | null> {
  const domain = "@" + fromEmail.split("@")[1];
  const rows = await sql`select pattern, rule from sender_rules where pattern in (${fromEmail}, ${domain})`;
  if (!rows.length) return null;
  const exact = rows.find((r) => r.pattern === fromEmail);
  return (exact ?? rows[0]).rule;
}

export async function runSync(opts: { maxMessages?: number } = {}): Promise<{ processed: number; decisions: number; noise: number }> {
  const account = await getAccount();
  if (!account) throw new Error("No Google account connected");

  const acctRows = await sql`select last_synced_at from google_accounts where email = ${account.email}`;
  const since = acctRows[0]?.last_synced_at ? new Date(acctRows[0].last_synced_at) : new Date(Date.now() - 3 * 86400_000);
  // Gmail search 'after:' is second-granular epoch; pad back 1h for safety.
  const afterEpoch = Math.floor((since.getTime() - 3600_000) / 1000);

  const messages = await listInboxMessages({ maxResults: opts.maxMessages ?? 40, q: `after:${afterEpoch}` });
  const travel = await upcomingTravel(30).catch(() => []);

  let decisions = 0;
  let noise = 0;
  let processed = 0;

  const labelIds: Record<string, string> = {};
  for (const [k, name] of Object.entries(LABELS)) {
    labelIds[k] = await ensureLabel(name).catch(() => "");
  }

  for (const msg of messages) {
    // skip if already seen
    const seen = await sql`select id, last_message_id from threads where id = ${msg.threadId}`;
    if (seen[0]?.last_message_id === msg.id) continue;
    // skip own messages
    if (msg.from.email === account.email) continue;
    processed++;

    let triage: TriageResult;
    const rule = await ruleFor(msg.from.email);
    if (rule === "noise") {
      triage = { category: "noise", magnitude: 1, decision_title: null, decision_summary: null, options: [], kind: null, needs_reply_by: null, signal_note: null, noise_reason: "sender rule" };
    } else {
      try {
        triage = await triageMessage(msg, account.email);
      } catch {
        triage = { category: "fyi", magnitude: 2, decision_title: null, decision_summary: null, options: [], kind: null, needs_reply_by: null, signal_note: null, noise_reason: null };
      }
      if (rule === "never_noise" && (triage.category === "noise" || triage.category === "signal_noise")) {
        triage.category = "fyi";
      }
      if (rule === "signal" && triage.category === "noise") {
        triage.category = "signal_noise";
        triage.signal_note = triage.signal_note ?? `${msg.from.email}: ${msg.subject}`;
      }
    }

    const participants = JSON.stringify([msg.from, ...msg.to, ...msg.cc]);
    await sql`
      insert into threads (id, account_email, subject, snippet, participants, last_message_at, last_message_id, last_from_me, category, triaged_at, raw_labels, updated_at)
      values (${msg.threadId}, ${account.email}, ${msg.subject}, ${msg.snippet}, ${participants}::jsonb, ${msg.date.toISOString()}, ${msg.id}, false, ${triage.category}, now(), ${msg.labelIds}, now())
      on conflict (id) do update set
        subject = excluded.subject, snippet = excluded.snippet, participants = excluded.participants,
        last_message_at = excluded.last_message_at, last_message_id = excluded.last_message_id,
        last_from_me = excluded.last_from_me, category = excluded.category, triaged_at = excluded.triaged_at,
        raw_labels = excluded.raw_labels, updated_at = now()`;

    if (triage.category === "noise" || triage.category === "signal_noise") {
      noise++;
      await sql`
        insert into noise_log (message_id, thread_id, from_email, subject, reason, is_signal, signal_note, received_at)
        values (${msg.id}, ${msg.threadId}, ${msg.from.email}, ${msg.subject}, ${triage.noise_reason}, ${triage.category === "signal_noise"}, ${triage.signal_note}, ${msg.date.toISOString()})
        on conflict (message_id) do nothing`;
      const add = [triage.category === "signal_noise" ? labelIds.signal : labelIds.noise].filter(Boolean);
      const remove = env.archiveNoise() && triage.category === "noise" ? ["INBOX"] : [];
      if (add.length || remove.length) await labelMessage(msg.id, add, remove).catch(() => {});
    } else if (triage.category === "decision" || triage.category === "scheduling") {
      decisions++;
      const kind = triage.category === "scheduling" ? "scheduling" : triage.kind ?? "reply";
      // travel note if a scheduling ask lands while a trip is in the next 30 days
      let travelNote: string | null = null;
      if (kind === "scheduling" && travel.length) {
        const soon = travelOverlapping(travel, new Date().toISOString(), new Date(Date.now() + 21 * 86400_000).toISOString());
        if (soon.length) {
          travelNote = soon
            .map((t) => `${t.summary || "Away"} ${t.start.slice(0, 10)} → ${t.end.slice(0, 10)}${t.location ? ` (${t.location})` : ""}`)
            .join("; ");
        }
      }
      const rank = await computeRank(msg.from.email, kind, triage, msg.date);
      // one open decision per thread: update if exists
      const existing = await sql`
        select id from decisions where thread_id = ${msg.threadId} and status in ('open','drafted','snoozed') limit 1`;
      const title = triage.decision_title ?? msg.subject;
      const options = JSON.stringify(triage.options ?? []);
      if (existing.length) {
        await sql`
          update decisions set title = ${title}, summary = ${triage.decision_summary}, options = ${options}::jsonb,
            magnitude = ${triage.magnitude}, kind = ${kind}, status = 'open', needs_reply_by = ${triage.needs_reply_by},
            travel_note = ${travelNote}, effective_rank = ${rank}, updated_at = now()
          where id = ${existing[0].id}`;
      } else {
        await sql`
          insert into decisions (thread_id, title, summary, options, magnitude, kind, status, needs_reply_by, travel_note, effective_rank)
          values (${msg.threadId}, ${title}, ${triage.decision_summary}, ${options}::jsonb, ${triage.magnitude}, ${kind}, 'open', ${triage.needs_reply_by}, ${travelNote}, ${rank})`;
      }
      if (labelIds.decision) await labelMessage(msg.id, [labelIds.decision]).catch(() => {});
    }

    // contact bookkeeping (inbound)
    await touchContact(msg.from.email, msg.from.name, msg.date, "in");
  }

  // outbound contact bookkeeping from recent sent mail
  const sent = await listSentMessages(15, `after:${afterEpoch}`).catch(() => []);
  for (const s of sent) {
    for (const to of s.to) await touchContact(to.email, to.name, s.date, "out");
    // mark threads we replied to; auto-complete open decisions on them
    await sql`update threads set last_from_me = true, updated_at = now() where id = ${s.threadId}`;
    await sql`update decisions set status = 'done', decided_at = now() where thread_id = ${s.threadId} and status = 'open'`;
  }

  await sql`update google_accounts set last_synced_at = now() where email = ${account.email}`;
  return { processed, decisions, noise };
}

async function computeRank(sender: string, kind: string, triage: TriageResult, msgDate: Date): Promise<number> {
  const senderKey = `sender:${sender}`;
  const kindKey = `kind:${kind}`;
  const rows = await sql`select key, bias from rank_bias where key in (${senderKey}, ${kindKey})`;
  const senderBias = rows.find((d) => d.key === senderKey)?.bias ?? 0;
  const kindBias = rows.find((d) => d.key === kindKey)?.bias ?? 0;
  return effectiveRank({
    magnitude: triage.magnitude,
    rankAdjust: 0,
    senderBias,
    kindBias,
    ageHours: (Date.now() - msgDate.getTime()) / 3600_000,
    needsReplyBy: triage.needs_reply_by ? new Date(triage.needs_reply_by) : null,
  });
}

async function touchContact(email: string, name: string, at: Date, dir: "in" | "out") {
  if (!email.includes("@")) return;
  const iso = at.toISOString();
  if (dir === "in") {
    await sql`
      insert into contacts (email, name, first_seen_at, last_inbound_at, inbound_count)
      values (${email}, ${name || null}, ${iso}, ${iso}, 1)
      on conflict (email) do update set
        name = coalesce(contacts.name, excluded.name),
        last_inbound_at = greatest(coalesce(contacts.last_inbound_at, 'epoch'::timestamptz), excluded.last_inbound_at),
        inbound_count = contacts.inbound_count + 1,
        updated_at = now()`;
  } else {
    await sql`
      insert into contacts (email, name, first_seen_at, last_outbound_at, outbound_count)
      values (${email}, ${name || null}, ${iso}, ${iso}, 1)
      on conflict (email) do update set
        name = coalesce(contacts.name, excluded.name),
        last_outbound_at = greatest(coalesce(contacts.last_outbound_at, 'epoch'::timestamptz), excluded.last_outbound_at),
        outbound_count = contacts.outbound_count + 1,
        updated_at = now()`;
  }
}

/**
 * Deep index for the CRM: walk further back through sent mail to establish
 * per-contact cadence baselines and warmth. Run on demand from /people.
 */
export async function indexRelationships(maxSent = 200): Promise<{ contacts: number }> {
  const sent = await listSentMessages(maxSent);
  const byContact = new Map<string, { name: string; dates: Date[] }>();
  for (const s of sent) {
    for (const to of s.to) {
      const cur = byContact.get(to.email) ?? { name: to.name, dates: [] };
      cur.dates.push(s.date);
      if (to.name && !cur.name) cur.name = to.name;
      byContact.set(to.email, cur);
    }
  }
  for (const [email, info] of byContact) {
    const dates = info.dates.sort((a, b) => a.getTime() - b.getTime());
    const gap = medianGapDays(dates);
    const existing = await sql`select * from contacts where email = ${email}`;
    const c = existing[0];
    const last = dates.at(-1)!;
    const lastContact = c?.last_inbound_at && new Date(c.last_inbound_at) > last ? new Date(c.last_inbound_at) : last;
    const warmth = warmthScore({
      lastContactAt: lastContact,
      medianGapDays: gap,
      targetCadenceDays: c?.target_cadence_days ?? null,
      toneScore: c?.tone_score ?? null,
    });
    await sql`
      insert into contacts (email, name, first_seen_at, last_outbound_at, outbound_count, median_gap_days, warmth)
      values (${email}, ${info.name || null}, ${dates[0].toISOString()}, ${last.toISOString()}, ${dates.length}, ${gap}, ${warmth})
      on conflict (email) do update set
        name = coalesce(contacts.name, excluded.name),
        first_seen_at = least(coalesce(contacts.first_seen_at, excluded.first_seen_at), excluded.first_seen_at),
        last_outbound_at = greatest(coalesce(contacts.last_outbound_at, 'epoch'::timestamptz), excluded.last_outbound_at),
        outbound_count = greatest(contacts.outbound_count, excluded.outbound_count),
        median_gap_days = excluded.median_gap_days,
        warmth = excluded.warmth,
        updated_at = now()`;
  }
  return { contacts: byContact.size };
}

/** Recompute warmth for all tracked contacts (cheap, no API calls). */
export async function refreshWarmth(): Promise<number> {
  const contacts = await sql`select * from contacts where do_not_track = false`;
  let n = 0;
  for (const c of contacts) {
    const lastMs = Math.max(...[c.last_inbound_at, c.last_outbound_at].filter(Boolean).map((x: unknown) => new Date(x as string).getTime()), 0);
    const warmth = warmthScore({
      lastContactAt: lastMs > 0 ? new Date(lastMs) : null,
      medianGapDays: c.median_gap_days,
      targetCadenceDays: c.target_cadence_days,
      toneScore: c.tone_score,
    });
    await sql`update contacts set warmth = ${warmth}, updated_at = now() where email = ${c.email}`;
    n++;
  }
  return n;
}
