export const metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <article className="max-w-prose2">
      <h1 className="font-serif">Cookies & local storage</h1>
      <p className="mt-3">
        We use only what is essential to run the review form.
      </p>
      <ul className="mt-4 list-disc pl-5 space-y-2">
        <li>
          <strong>localStorage</strong>: a random anonymous browser token (used as a salted hash on the server to detect duplicate submissions), and your in-progress answers so you can come back to them.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong>: required for security on the final submit and contact form, when enabled.
        </li>
        <li>
          <strong>No analytics cookies</strong>. No Google Analytics. No Meta pixel. No tracking pixels.
        </li>
      </ul>
      <p className="mt-4">
        If we ever add analytics in future, we will ask for consent first.
      </p>
    </article>
  );
}
