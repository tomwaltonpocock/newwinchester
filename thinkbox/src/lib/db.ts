import { neon } from "@neondatabase/serverless";
import { env } from "./env";

export type Row = Record<string, any>;

// Schema is applied lazily on first query — no migration step needed.
const SCHEMA: string[] = [
  `create table if not exists google_accounts (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    refresh_token_enc text not null,
    access_token_enc text,
    access_token_expires_at timestamptz,
    scopes text[] not null default '{}',
    history_id text,
    last_synced_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists threads (
    id text primary key,
    account_email text not null,
    subject text,
    snippet text,
    participants jsonb not null default '[]',
    last_message_at timestamptz,
    last_message_id text,
    last_from_me boolean default false,
    message_count int default 0,
    category text,
    triaged_at timestamptz,
    raw_labels text[] default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists threads_last_message_idx on threads (last_message_at desc)`,
  `create table if not exists decisions (
    id uuid primary key default gen_random_uuid(),
    thread_id text not null references threads(id) on delete cascade,
    title text not null,
    summary text,
    options jsonb default '[]',
    magnitude int not null default 3,
    rank_adjust int not null default 0,
    effective_rank double precision not null default 0,
    kind text not null default 'reply',
    status text not null default 'open',
    snoozed_until timestamptz,
    needs_reply_by timestamptz,
    draft_subject text,
    draft_body text,
    gmail_draft_id text,
    travel_note text,
    decided_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists decisions_status_idx on decisions (status, effective_rank desc)`,
  `create table if not exists rank_bias (
    key text primary key,
    bias double precision not null default 0,
    samples int not null default 0,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists contacts (
    email text primary key,
    name text,
    first_seen_at timestamptz,
    last_inbound_at timestamptz,
    last_outbound_at timestamptz,
    inbound_count int default 0,
    outbound_count int default 0,
    median_gap_days double precision,
    tone_score double precision,
    tone_summary text,
    warmth double precision,
    is_power boolean not null default false,
    power_rank int,
    target_cadence_days int,
    notes text,
    do_not_track boolean not null default false,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists priorities (
    id uuid primary key default gen_random_uuid(),
    period text not null default 'week',
    content text not null,
    active boolean not null default true,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists stat_prefs (
    stat_key text primary key,
    kept boolean not null default true,
    custom_prompt text,
    position int default 0,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists weekly_reviews (
    id uuid primary key default gen_random_uuid(),
    week_start date not null unique,
    stats jsonb not null default '{}',
    narrative text,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists noise_log (
    message_id text primary key,
    thread_id text,
    from_email text,
    subject text,
    reason text,
    is_signal boolean not null default false,
    signal_note text,
    received_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists sender_rules (
    pattern text primary key,
    rule text not null,
    note text,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists voice_profile (
    id int primary key default 1,
    profile text,
    samples_analyzed int default 0,
    built_at timestamptz,
    constraint single_row check (id = 1)
  )`,
  `create table if not exists settings (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
  )`,
];

let client: ReturnType<typeof neon> | null = null;
let ready: Promise<void> | null = null;

function raw(): ReturnType<typeof neon> {
  if (!client) client = neon(env.databaseUrl());
  return client;
}

async function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const c = raw();
      for (const stmt of SCHEMA) await c.query(stmt);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

/** Tagged-template query; applies the schema on first use. Returns rows. */
export async function sql(strings: TemplateStringsArray, ...params: unknown[]): Promise<Row[]> {
  await ensureSchema();
  return (await raw()(strings, ...params)) as Row[];
}
