export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="max-w-prose2">
      <h1 className="font-serif">Terms</h1>
      <p className="mt-3">
        Vision for Winchester is a citizen-led, independent feedback site. It is not an official Winchester City Council consultation.
      </p>
      <ul className="mt-4 list-disc pl-5 space-y-2">
        <li>The alternative images are illustrative only, not technical planning drawings.</li>
        <li>By uploading an image you confirm you have the right to share it.</li>
        <li>Do not submit abusive, defamatory or unlawful content.</li>
        <li>
          We may remove uploads or comments from any public or reported output without notice if they fall outside the rules above.
        </li>
        <li>
          Submitting here does not replace any formal planning process. To respond to a statutory consultation, use the official channels published by Winchester City Council.
        </li>
      </ul>
    </article>
  );
}
