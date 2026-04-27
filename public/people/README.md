# Photos of decision-makers shown on the homepage

Default placeholders are SVG initials. Drop a real `.jpg` or `.png` (square, ~400×400px, ≤200 KB, EXIF stripped) and update the `imagePath` field in `src/content/recipients.ts` to match.

Their email addresses live in environment variables, **never in the codebase**:

- `RECIPIENT_MARTIN_TOD_EMAIL`
- `RECIPIENT_MATT_WOOLGAR_EMAIL`
- (one per id, see recipients.ts)

If a recipient's email env var is unset, the platform stores the message but never forwards. If `RESEND_API_KEY` is unset, same. If `ANTHROPIC_API_KEY` is unset, every message is held for admin review (never auto-forwarded).
