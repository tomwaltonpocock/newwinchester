# Thinkbox

Your inbox, one level up. A private Gmail overlay that:

1. **Raises decisions, not emails.** Every actionable thread becomes a succinct decision card, scored by magnitude. Up/down-rank cards and Thinkbox learns your sense of what matters (per sender, per kind of ask). Replies are drafted in *your* authorial voice — a style guide distilled from your real sent mail, with hard rules against AI tells. Meeting requests open a tap-to-pick grid of your genuinely free times; the reply is drafted around your picks, with a warning when a trip in your calendar collides.
2. **Keeps your people warm.** A CRM indexed from your own mailbox. Warmth is judged against each relationship's *own* cadence (a quarterly friendship isn't cold at six weeks; a weekly one is) plus tone. Star people onto your power list; Thinkbox flags them before they unduly age and drafts the keep-warm note.
3. **Lets you strategise.** Set weekly/monthly priorities. A weekly review writes a calm look-back and look-forward, and serves stats — keep the ones you like, hide the ones you don't, ask for new ones in plain English.
4. **Sets noise aside without losing it.** Junk is labelled `Thinkbox/Noise` and logged — never deleted (archiving is opt-in via `ARCHIVE_NOISE`). Sender rules let you pull signals out of the noise: DocSend view alerts, signature confirmations, data-room access show up as one-line signals, not emails.

Nothing is ever sent without you pressing Send.

---

## Setup (three keys, one deploy)

### 1. Google OAuth (~4 min — the only fiddly bit)

For personal use you do **not** need Google verification — a project in "Testing" mode works indefinitely.

1. [console.cloud.google.com](https://console.cloud.google.com) → New project.
2. **APIs & Services → Library** → enable **Gmail API** and **Google Calendar API**.
3. **OAuth consent screen** → External → Audience: **Testing** → add your Gmail as a **test user**.
4. **Credentials → OAuth client ID → Web application** → redirect URI `https://<your-app>.vercel.app/api/auth/google/callback` (add `http://localhost:3100/api/auth/google/callback` too for local dev).

### 2. Anthropic key (~1 min)

[console.anthropic.com](https://console.anthropic.com) → API key.

### 3. Deploy on Vercel (~4 min)

1. Import the repo, **Root Directory = `thinkbox`**.
2. Env vars: `APP_PASSWORD` (e.g. `tom:long-passphrase`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`. Deploy.
3. **Storage tab → Create Database → Neon (Postgres)** — `DATABASE_URL` is injected automatically; the schema creates itself on first request. No SQL to run.
4. Open the app → log in with `APP_PASSWORD` → **Settings → Connect Google** → **Build voice profile** → **Sync now** → on **People**, **Index mailbox** and star your power list.

Cron hits `/api/sync` every 15 minutes automatically. Add the app to your phone's home screen and stop opening Gmail.

Local dev: `cp .env.example .env.local`, fill it (paste the Neon `DATABASE_URL`), `npm install`, `npm run dev` → http://localhost:3100.

---

## Architecture

- **Next.js 14 (app router)**, single-user, HTTP Basic Auth via middleware.
- **Neon Postgres (via Vercel Storage)** for all state; schema self-creates on boot; Google tokens encrypted at rest (AES-256-GCM, key derived from `APP_PASSWORD` unless overridden).
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

- Email content goes to Anthropic for triage/drafting and is stored (bodies only transiently; snippets/summaries persist) in your own Neon database. Both are under your keys.
- Nothing is deleted from Gmail, ever. `ARCHIVE_NOISE=true` archives (not deletes) classified noise, off by default.
- All sending requires an explicit click in the UI.
