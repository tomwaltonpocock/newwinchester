# Vision for Winchester — Future of Silver Hill

Citizen-led visual review of the Central Winchester / Silver Hill regeneration proposals. Mobile-first PWA, deployed on Vercel.

This is **not** an official Winchester City Council consultation. The site says so prominently.

---

## 1. Quick start

```bash
npm install
cp .env.example .env.local   # fill in values, see §2
npm run dev                  # http://localhost:3000
```

Type-check and unit tests:

```bash
npm run typecheck
npm test
```

End-to-end (Playwright) tests:

```bash
npx playwright install --with-deps
npm run test:e2e
```

---

## 2. Environment variables

See `.env.example`. The minimum to boot the app and run a real submission:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project
- `HASH_SALT` — long random string (≥ 32 chars). Rotating it invalidates existing hashes.
- `ENCRYPTION_KEY_BASE64` — `openssl rand -base64 32`
- `ADMIN_PASSWORD_FALLBACK` — `user:password` for /admin Basic Auth
- `NEXT_PUBLIC_SITE_URL` — your final URL

Optional, light up automatically when set:

- **Cloudflare Turnstile** — `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. If absent, the site falls back to honeypot + rate limiting only.
- **Mailchimp** — `MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER_PREFIX`, `MAILCHIMP_AUDIENCE_ID`. If absent, opt-ins are stored in the local `subscribers` table.
- **Resend** — `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `USER_CAMPAIGN_INBOX`. If absent, contact messages are stored only.

Validation policy:

- `ALLOWED_POSTCODE_OUTWARDS` — defaults to `SO22,SO23`
- `STORE_FULL_POSTCODE` — defaults to `false`
- `SHOW_IMAGE_SOURCES` — defaults to `false` (keeps Option A / Option B neutral during the review)

---

## 3. Supabase setup

1. Create a Supabase project and grab the URL + service-role key.
2. Run the migration in `supabase/migrations/001_init.sql`:
   - SQL editor → paste the file → Run, **or** `supabase db push` if using the CLI.
3. Create a **private** storage bucket named `uploads`:
   - Storage → New bucket → name `uploads`, **uncheck** Public.
4. RLS is enabled on every table. The app uses the service role key (server-side only) to write. Anon/auth keys cannot read or write — leave it that way.

---

## 4. Cloudflare Turnstile (optional)

1. Cloudflare dashboard → Turnstile → Add site.
2. Use a “Managed” widget. Take the site key + secret key.
3. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel env vars.

If you don't configure Turnstile, the site still works: spam protection falls back to honeypot + rate limit. For a 30k-impression press campaign, Turnstile is recommended.

---

## 5. Mailchimp (optional, for update emails)

1. Create an audience in Mailchimp.
2. Generate an API key. The server prefix is the `usX` part of your data center (e.g. `us21`).
3. Set `MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER_PREFIX`, `MAILCHIMP_AUDIENCE_ID`.
4. Audience settings → set "Enable double opt-in" — this site uses pending status by default; Mailchimp will send the confirmation email from your account.

If you don't configure Mailchimp, opt-ins go into a local `subscribers` table that you can export. You'll need an external way to send the eventual newsletter.

---

## 6. Resend (optional, for contact-form auto-acknowledge)

1. Resend → API keys → create.
2. Verify a sending domain so `CONTACT_FROM_EMAIL` works (e.g. `hello@visionforwinchester.org`).
3. Set `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `USER_CAMPAIGN_INBOX`.

If absent, contact messages are stored in `contact_messages` and visible in `/admin/contact`. No emails are sent.

---

## 7. Vercel deploy

1. `vercel link` (first time) or push to a Vercel-connected GitHub repo.
2. Add the environment variables from `.env.example` in the Vercel project (Settings → Environment Variables).
3. Deploy: `vercel --prod` or merge to `main`.
4. After first deploy:
   - Visit `/admin` — you should be challenged for HTTP Basic auth.
   - Visit `/privacy` — check the Controller and Contact placeholders are filled in.
   - Visit `/chronicle` — should redirect with `?source=chronicle`.

---

## 8. Adding image aspects (this is the only image step you need)

**Drop files into `public/aspects/` using this naming convention:**

```
public/aspects/aspect-1-0.png    ← developer / current proposal (REQUIRED)
public/aspects/aspect-1-1.png    ← AI alternative 1 (optional)
public/aspects/aspect-1-2.png    ← AI alternative 2 (optional)
public/aspects/aspect-1-3.png    ← AI alternative 3 (optional)

public/aspects/aspect-2-0.png    ← developer for aspect 2
public/aspects/aspect-2-1.png    ← alt 1 for aspect 2
…and so on for as many aspects as you want.
```

- The number of alternatives per aspect can be **1, 2 or 3** — the UI adapts.
- Accepted extensions: `.png` (recommended), `.jpg`, `.jpeg`, `.webp`, `.svg`.
- Aim for ≤ 300 KB per image, ~1600 px on the long edge, **EXIF stripped**.
- 4:3 aspect ratio renders best.

**That's it. There's no JSON to edit.** The discovery script (`scripts/build-aspects.mjs`) runs automatically before `dev`, `build` and `start`, scanning `public/aspects/` and generating `src/content/aspects.generated.ts`. Run it manually with `npm run aspects`.

**Optional metadata** (titles, questions, "what to notice" bullets) lives in `src/content/aspects.ts`. Anything not customised falls back to "Aspect N" with a generic question.

The slider/side-by-side toggle and alt picker appear automatically when there are alternatives.

---

## 9. Council / decision-maker recipient list

Set `COUNCIL_EMAILS` (comma-separated). Verify each one before launch. The default seed in `.env.example` includes:

- `mtod@winchester.gov.uk`
- `customerservice@winchester.gov.uk`
- `info@partnershipsandplaces.co.uk` ← **TODO: confirm whether to include the private development partner. Sending residents' political views to a private firm is a UK GDPR consideration.**

Optional BCC: `USER_CAMPAIGN_INBOX` (e.g. `hello@visionforwinchester.org`).

---

## 10. Running tests

```bash
npm test                  # vitest, unit tests
npm run test:e2e          # Playwright; runs against a build
```

The Playwright tests assume the dev or production server is running. Set `BASE_URL` to test against a deployed URL.

---

## 11. Launch checklist

- [ ] `.env.local` filled, secrets in Vercel
- [ ] Supabase migration applied
- [ ] Storage bucket `uploads` exists and is private
- [ ] Real aspect images dropped under `public/aspects/` (`aspect-N-K.png`)
- [ ] `og-image.svg` replaced with a 1200×630 PNG (`og-image.png`)
- [ ] Privacy controller name + contact email filled in `/privacy`
- [ ] Council recipient list verified
- [ ] Turnstile keys set (recommended for press campaign)
- [ ] `ADMIN_PASSWORD_FALLBACK` set, tested at `/admin`
- [ ] DNS pointed at Vercel
- [ ] Final QR generated from `/chronicle` URL
- [ ] Lighthouse run on mobile, LCP < 2.5s on simulated 4G
- [ ] ICO data-protection fee paid (if you are the controller)
- [ ] DPIA written if you expect > 5k responses
- [ ] Privacy notice last-updated date set

---

## 12. Browser QA checklist

Manual smoke pass before the Hampshire Chronicle link goes live:

- [ ] iPhone Safari (latest)
- [ ] iPhone Safari (one major version back) if available
- [ ] Android Chrome
- [ ] Samsung Internet
- [ ] Desktop Chrome / Edge / Firefox / Safari
- [ ] Widths: 320, 375, 390, 428, 768, 1024, 1440
- [ ] Slow 4G test
- [ ] Image modal closes with Escape key
- [ ] Form submit on flaky network (recovery message)
- [ ] Mailchimp double opt-in confirmation arrives
- [ ] Turnstile fail state (block JS, retry)
- [ ] Admin export downloads cleanly
- [ ] All footer links resolve (`/privacy`, `/cookies`, `/terms`)
- [ ] `/admin/report` prints cleanly to PDF

---

## 13. Privacy & data checklist

- [ ] Controller named on `/privacy` (not `[YOUR NAME]`)
- [ ] No raw IPs anywhere in DB (`select ip_hash from submissions limit 1` should look like a hex hash)
- [ ] Encryption key rotated only once at launch and stored separately from the database
- [ ] HASH_SALT not committed; treat as a secret
- [ ] Retention dates written into a runbook (18m responses, 90d hashes, 12m contact, 18m uploads)
- [ ] Council export excludes IP/UA/participant hashes (`/api/admin/export?type=council`)
- [ ] Public share `/s/[token]` shows no email, no exact postcode
- [ ] Cookies page accurate (no analytics added without consent banner)

---

## 14. Export / report instructions

Admin endpoints (HTTP Basic Auth required):

- `/admin/report` — print-friendly public summary (browser → Print → Save as PDF)
- `/api/admin/export?type=submissions` — full submissions CSV (internal columns)
- `/api/admin/export?type=aspects` — aspect responses CSV (star ratings per image)
- `/api/admin/export?type=comments` — comments CSV
- `/api/admin/export?type=missing` — missing-info CSV
- `/api/admin/export?type=council` — Council summary CSV (consented submissions only, hashes stripped)

---

## Cost expectation (rough)

- **Vercel** — Hobby is fine for traffic peaks under ~30k clicks if images are optimised. Upgrade to Pro for headroom around press launch.
- **Supabase** — Free tier covers 5k–10k responses comfortably; move to Pro for production reliability and longer log retention.
- **Cloudflare R2 / Supabase Storage** — Negligible at the volumes expected (≤ 40 GB even worst-case 10k × 2 × 2 MB).
- **Mailchimp** — Free tier (500 contacts) is too small for serious Winchester opt-in; budget for a paid tier matched to your list size.
- The main cost risk is **unoptimised image bandwidth** on the landing/review pages and **email-list size**, not Postgres rows.

---

## Architecture refinements vs. original spec

Three simplifications applied without removing functionality:

1. **Supabase Storage** replaces Cloudflare R2 (one less SDK, one less DPA, signed URLs built-in).
2. **Turnstile / Mailchimp / Resend are optional** — app boots and accepts submissions with just Supabase + the honeypot/rate-limit fallbacks.
3. **HTTP Basic Auth** for `/admin` (the spec's named MVP fallback) — one env var, no Supabase Auth setup needed for launch.

Everything else (schema, validation scoring, mailto-only Council route, 90-second quick path, share/Council link) is built as specified.
