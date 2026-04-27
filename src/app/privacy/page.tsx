import { siteCopy } from "@/content/siteCopy";
import { env } from "@/lib/env";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="prose-civic max-w-prose2">
      <h1 className="font-serif">Privacy</h1>
      <p className="text-sm text-stone-600">Plain-English notice. Last updated: when this site launches.</p>

      <h2 className="mt-6 font-serif">Who runs this site</h2>
      <p>
        Controller: <strong>[YOUR NAME / ORGANISATION]</strong> — TODO before launch.<br />
        Contact: <strong>[CONTACT EMAIL]</strong> — see the <a href="/contact">contact page</a>.
      </p>
      <p className="text-sm text-stone-700">
        {siteCopy.disclaimer}
      </p>

      <h2 className="mt-6 font-serif">Why we collect data</h2>
      <ol>
        <li>To collect and analyse public feedback on the Silver Hill / Central Winchester visuals.</li>
        <li>To understand whether responses come from people with local relevance.</li>
        <li>To prevent spam, duplicates and abuse.</li>
        <li>To share anonymised or consented summaries with the Council and development team.</li>
        <li>To send updates and event invitations only to people who explicitly opt in.</li>
        <li>To handle direct contact messages.</li>
      </ol>

      <h2 className="mt-6 font-serif">What we collect</h2>
      <ul>
        <li>Your choices and preferences in the review.</li>
        <li>Comments you choose to write.</li>
        <li>Your postcode area or sector if you choose to provide it. We do not store the full postcode by default.</li>
        <li>Timestamp and the source link or campaign you arrived from.</li>
        <li>A salted one-way hash of your IP address (we do not store the raw address) and coarse country/region/city if available from network headers.</li>
        <li>An anonymous browser token (stored only as a salted hash on the server) to detect duplicate submissions.</li>
        <li>An optional email address if you ask for updates or send a contact message.</li>
        <li>Optional image uploads you choose to share.</li>
      </ul>

      <h2 className="mt-6 font-serif">Lawful basis</h2>
      <ul>
        <li>Legitimate interests for feedback analysis, local-validation tagging and abuse prevention.</li>
        <li>Consent for update and event emails.</li>
        <li>Consent for sharing your submission link or uploads with the Council/development team.</li>
        <li>Legitimate interests or consent, as appropriate, for replying to contact messages.</li>
      </ul>

      <h2 className="mt-6 font-serif">Who processes the data</h2>
      <ul>
        <li>Vercel (hosting).</li>
        <li>Supabase (database and private file storage).</li>
        {env.mailchimp.enabled && <li>Mailchimp (update emails, where you opt in).</li>}
        {env.turnstile.enabled && <li>Cloudflare Turnstile (bot protection on the form).</li>}
        {env.resend.enabled && <li>Resend (transactional notifications and reply emails).</li>}
      </ul>

      <h2 className="mt-6 font-serif">How long we keep it</h2>
      <ul>
        <li>Survey responses: up to 18 months, or until the planning phase and reporting need ends — whichever is sooner.</li>
        <li>Validation hashes (IP/UA hashes, participant token hashes): up to 90 days, unless an abuse investigation needs longer.</li>
        <li>Contact messages: up to 12 months.</li>
        <li>Update-list contacts: until you unsubscribe or ask us to delete.</li>
        <li>Uploaded images: up to 18 months, earlier if withdrawn or deleted.</li>
      </ul>

      <h2 className="mt-6 font-serif">Your rights</h2>
      <p>
        You have the right to access, rectification, erasure, objection, restriction, and withdrawal of consent for emails. To exercise any of these, use the <a href="/contact">contact form</a> and choose “Privacy / data request”.
      </p>
      <p>
        Every update email contains an unsubscribe link. You can also ask us to delete your contact message at any time.
      </p>

      <h2 className="mt-6 font-serif">Things to be careful about</h2>
      <ul>
        <li>Please do not include sensitive personal information in comments.</li>
        <li>Uploaded images may be reviewed before any sharing.</li>
        <li>This is not an official Winchester City Council consultation. Submitting here does not replace any formal planning process.</li>
      </ul>
    </article>
  );
}
