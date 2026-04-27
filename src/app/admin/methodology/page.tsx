export const metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <article className="max-w-prose2">
      <h1 className="font-serif">Methodology</h1>

      <h2 className="font-serif mt-6">Image-pair ordering</h2>
      <p>
        For every participant, the left/right placement of the developer image versus the citizen-refined image is randomised independently per pair. The mapping is stored with the response so analysis can recover which kind of image the resident actually preferred.
      </p>
      <p>
        The two options are labelled neutrally as “Option A” and “Option B” during the review. The “developer” / “refined” labels are only revealed during the review if the operator explicitly enables <code>SHOW_IMAGE_SOURCES=true</code> for transparency reasons.
      </p>

      <h2 className="font-serif mt-6">Validation score</h2>
      <p>
        Every completed submission is given a validation score from these signals:
      </p>
      <ul className="list-disc pl-5">
        <li>+35 if the postcode outward is in the configured allowed list (Winchester area).</li>
        <li>+20 if the postcode is a valid UK code outside that list.</li>
        <li>+15 if the request IP geolocates to GB.</li>
        <li>+10 if region/city headers suggest Hampshire or Winchester.</li>
        <li>+10 if the participant is unique in the last 24 hours.</li>
        <li>+15 if email opt-in confirms double opt-in (added later, not at submit time).</li>
        <li>−25 for a duplicate participant in the last 24 hours.</li>
        <li>−20 for an IP repeated beyond the normal threshold.</li>
        <li>Reject outright if Turnstile fails or the honeypot field is filled.</li>
      </ul>
      <p>
        Categories: <strong>0–34 low confidence · 35–64 plausible · 65+ higher confidence</strong>.
      </p>

      <h2 className="font-serif mt-6">Limitations</h2>
      <ul className="list-disc pl-5">
        <li>Validation is probabilistic, not identity verification. A higher-confidence response is not “proof” it came from a Winchester resident.</li>
        <li>Postcode and IP geo can be wrong, missing, or edge-case (mobile networks, VPNs, business connections).</li>
        <li>The IP and participant-token hashes are pseudonymous, not anonymous: linkable with effort, and treated under UK GDPR.</li>
        <li>Public reports are intended for editorial use, not statutory consultation.</li>
      </ul>
    </article>
  );
}
