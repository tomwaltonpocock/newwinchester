# Thinkbox

Your inbox, one level up. A private Gmail overlay that:

1. **Raises decisions, not emails.** Every actionable thread becomes a succinct decision card, scored by magnitude. Up/down-rank cards and Thinkbox learns your sense of what matters (per sender, per kind of ask). Replies are drafted in *your* authorial voice — a style guide distilled from your real sent mail, with hard rules against AI tells. Meeting requests open a tap-to-pick grid of your genuinely free times; the reply is drafted around your picks, with a warning when a trip in your calendar collides.
2. **Keeps your people warm.** A CRM indexed from your own mailbox. Warmth is judged against each relationship's *own* cadence (a quarterly friendship isn't cold at six weeks; a weekly one is) plus tone. Star people onto your power list; Thinkbox flags them before they unduly age and drafts the keep-warm note.
3. **Lets you strategise.** Set weekly/monthly priorities. A weekly review writes a calm look-back and look-forward, and serves stats — keep the ones you like, hide the ones you don't, ask for new ones in plain English.
4. **Sets noise aside without losing it.** Junk is labelled `Thinkbox/Noise` and logged — never deleted (archiving is opt-in via `ARCHIVE_NOISE`). Sender rules let you pull signals out of the noise: DocSend view alerts, signature confirmations, data-room access show up as one-line signals, not emails.

Nothing is ever sent without you pressing Send.

---

## Setup (~20 minutes, one-time)

### 1. Google Cloud (Gmail + Calendar access)

For personal use you do **not** need Google verification — a project in "Testing" mode works indefinitely for the test users you add.

1. [console.cloud.google.com](https://console.cloud.google.com) → New project (e.g. `thinkbox`).
2. **APIs & Services → Library** → enable **Gmail API** and **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → External → fill in app name + your email → **Audience: Testing** → add your Gmail address as a **test user**.
4. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorised redirect URI: `http://localhost:3100/api/auth/google/callback` (add your production URL later, e.g. `https://thinkbox-xyz.vercel.app/api/auth/google/callback`).
5. Copy the client ID + secret into `.env.local`.

> Note: refresh tokens for Testing-mode apps whose consent screen requests sensitive scopes do not expire, but if Google ever invalidates one, just visit `/api/auth/google` again.

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor → paste `supabase/migrations/001_init.sql` → Run.
3. Copy the project URL + **service role** key into `.env.local`.

### 3. Anthropic

Create an API key at [console.anthropic.com](https://console.anthropic.com) → `ANTHROPIC_API_KEY`.

### 4. Run it

```bash
cd thinkbox
cp .env.example .env.local   # fill everything in; generate the two secrets as commented
npm install
npm run dev                  # http://localhost:3100
```

Log in with your `APP_PASSWORD` (Basic Auth), then on **Settings**:

1. **Connect Google** — approve the consent screen.
2. **Build voice profile** — distils your style from sent mail.
3. **Sync now** — first triage of recent inbox mail.
4. On **People**, press **Index mailbox** to build the CRM, then star your power list.
5. On **Review**, set your priorities and build the first weekly review.

### 5. Deploy (Vercel)

1. Import the repo in Vercel, set **Root Directory = `thinkbox`**.
2. Add every var from `.env.example` (set `NEXT_PUBLIC_APP_URL` to the deployed URL).
3. Add the production redirect URI in Google Cloud credentials.
4. `vercel.json` schedules `/api/sync` every 15 minutes; Vercel automatically sends `Authorization: Bearer $CRON_SECRET`, which the middleware accepts.

Add it to your phone's home screen and stop opening Gmail.

---

## Architecture

- **Next.js 14 (app router)**, single-user, HTTP Basic Auth via middleware.
- **Supabase (Postgres)** for all state; Google tokens encrypted at rest (AES-256-GCM).
- **Gmail API** (`gmail.modify`) — read, label, draft, send. **Calendar API** — free/busy, travel detection.
- **Anthropic**: a fast model (`TRIAGE_MODEL`) classifies every message; a strong model (`DRAFTING_MODEL`) writes drafts, keep-warm notes, and the weekly narrative.
- Sync flow (`src/lib/sync.ts`): new inbox mail → sender rules → triage → decision cards / noise log / signals → Gmail labels → contact bookkeeping → warmth refresh. Your own replies auto-complete open decisions on those threads.
- Ranking (`src/lib/rank.ts`): magnitude anchors, your up/down-ranks dominate and feed a learned per-sender/per-kind bias (EMA), deadlines and gentle aging break ties.
- Warmth (`src/lib/warmth.ts`): decay measured in multiples of the relationship's own median gap, tone shifts the curve, manual target cadence overrides.

## Tests

```bash
npm test          # pure logic: ranking, warmth, slots, parsing
npm run typecheck
```

## Privacy notes

- Email content goes to Anthropic for triage/drafting and is stored (bodies only transiently; snippets/summaries persist) in your own Supabase project. Both are under your keys.
- Nothing is deleted from Gmail, ever. `ARCHIVE_NOISE=true` archives (not deletes) classified noise, off by default.
- All sending requires an explicit click in the UI.
