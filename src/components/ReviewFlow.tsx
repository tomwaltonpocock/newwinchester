"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Aspect } from "@/content/aspects";
import { siteCopy } from "@/content/siteCopy";
import { missingInfoOptions } from "@/content/missingInfoOptions";
import { ProgressBar } from "./ProgressBar";
import { AspectChooser, type AspectStars } from "./AspectChooser";
import { CheckboxGrid } from "./CheckboxGrid";
import { ConsentPanel } from "./ConsentPanel";
import { UploadDropzone, type UploadedFile } from "./UploadDropzone";
import { Turnstile } from "./Turnstile";

const STORAGE_KEY = "vfw:flow:v2";
const PARTICIPANT_KEY = "vfw:participant:v1";

type AspectState = {
  stars: AspectStars;
  comment: string;
  displayOrder: number[];
};

function getParticipantToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem(PARTICIPANT_KEY);
  if (!t) {
    t = crypto.randomUUID() + "-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(PARTICIPANT_KEY, t);
  }
  return t;
}

const emptyStars: AspectStars = { developer: null, alt1: null, alt2: null, alt3: null };

export function ReviewFlow({
  aspects,
  turnstileSiteKey,
  urbanScienceUrl,
}: {
  aspects: Aspect[];
  turnstileSiteKey: string;
  urbanScienceUrl: string;
}) {
  const router = useRouter();
  const totalSteps = 1 + aspects.length + 3; // explainer + aspects + missing + upload + validation
  const [step, setStep] = useState(0);

  const [aspectState, setAspectState] = useState<Record<number, AspectState>>(() => {
    const out: Record<number, AspectState> = {};
    for (const a of aspects) {
      // Random display order for the alternative chips.
      const order = [...a.altIndices].sort(() => Math.random() - 0.5);
      out[a.n] = { stars: { ...emptyStars }, comment: "", displayOrder: order };
    }
    return out;
  });

  const [missingChoices, setMissingChoices] = useState<string[]>([]);
  const [missingComment, setMissingComment] = useState("");
  const [generalComment, setGeneralComment] = useState("");
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploadRights, setUploadRights] = useState(false);
  const [uploadShare, setUploadShare] = useState(false);

  const [postcode, setPostcode] = useState("");
  const [email, setEmail] = useState("");
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentShareCouncil, setConsentShareCouncil] = useState(false);
  const [consentPublicSummary, setConsentPublicSummary] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Restore in-progress state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.aspectState) setAspectState(data.aspectState);
        if (data.missingChoices) setMissingChoices(data.missingChoices);
        if (data.missingComment) setMissingComment(data.missingComment);
        if (data.generalComment) setGeneralComment(data.generalComment);
        if (data.postcode) setPostcode(data.postcode);
        if (data.email) setEmail(data.email);
        if (data.consentEmail !== undefined) setConsentEmail(data.consentEmail);
        if (data.consentShareCouncil !== undefined) setConsentShareCouncil(data.consentShareCouncil);
        if (data.consentPublicSummary !== undefined) setConsentPublicSummary(data.consentPublicSummary);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          aspectState,
          missingChoices,
          missingComment,
          generalComment,
          postcode,
          email,
          consentEmail,
          consentShareCouncil,
          consentPublicSummary,
        })
      );
    } catch {}
  }, [
    aspectState,
    missingChoices,
    missingComment,
    generalComment,
    postcode,
    email,
    consentEmail,
    consentShareCouncil,
    consentPublicSummary,
  ]);

  // Begin a submission once we hit the first aspect.
  useEffect(() => {
    if (startedRef.current) return;
    if (step < 1) return;
    startedRef.current = true;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const source = url.searchParams.get("source") || (document.referrer ? "referral" : "direct");
        const utm: Record<string, string> = {};
        for (const [k, v] of url.searchParams.entries()) {
          if (k.toLowerCase().startsWith("utm_")) utm[k] = v.slice(0, 100);
        }
        const res = await fetch("/api/submissions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantToken: getParticipantToken(),
            source,
            referrer: document.referrer || null,
            utm,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSubmissionId(data.id);
          setPublicToken(data.public_token);
        }
      } catch {}
    })();
  }, [step]);

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const aspectsArrayState = useMemo(
    () =>
      aspects.map((a) => {
        const s = aspectState[a.n];
        return {
          aspectN: a.n,
          displayOrder: s.displayOrder,
          starDeveloper: s.stars.developer,
          starAlt1: s.stars.alt1,
          starAlt2: s.stars.alt2,
          starAlt3: s.stars.alt3,
          comment: s.comment || null,
        };
      }),
    [aspects, aspectState]
  );

  // Allow advancing if any star has been set for this aspect.
  const aspectAdvanceable = (n: number) => {
    const s = aspectState[n].stars;
    return s.developer != null || s.alt1 != null || s.alt2 != null || s.alt3 != null;
  };

  async function submit() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          publicToken,
          participantToken: getParticipantToken(),
          honeypot,
          turnstileToken,
          aspects: aspectsArrayState,
          generalComment: generalComment || null,
          missing: { options: missingChoices, comment: missingComment || null },
          postcode: postcode || null,
          email: email || null,
          consentEmail,
          consentShareCouncil,
          consentPublicSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "submit_failed");
        return;
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      const params = new URLSearchParams();
      params.set("t", data.publicToken);
      if (data.shareUrl) params.set("share", data.shareUrl);
      if (data.summary) {
        params.set("pa", String(data.summary.preferredAlternative ?? 0));
        params.set("pc", String(data.summary.preferredCurrent ?? 0));
        params.set("tie", String(data.summary.tieOrUnrated ?? 0));
        params.set("ttl", String(data.summary.total ?? aspects.length));
      }
      router.push(`/thank-you?${params.toString()}`);
    } catch (e) {
      setSubmitError("network_error");
    } finally {
      setSubmitting(false);
    }
  }

  const ASPECT_OFFSET = 1;
  const MISSING = ASPECT_OFFSET + aspects.length;
  const UPLOAD = MISSING + 1;
  const VALIDATION = UPLOAD + 1;

  return (
    <div>
      <ProgressBar step={step + 1} total={totalSteps} />

      {step === 0 && (
        <section>
          <h2 className="font-serif">{siteCopy.review.explainerTitle}</h2>
          <p className="mt-3 text-stone-700">{siteCopy.review.explainerBody}</p>
          <div className="mt-6 flex justify-end">
            <button type="button" className="btn" onClick={next}>{siteCopy.review.next}</button>
          </div>
        </section>
      )}

      {step >= ASPECT_OFFSET && step < MISSING && (() => {
        const idx = step - ASPECT_OFFSET;
        const aspect = aspects[idx];
        if (!aspect) return null;
        const s = aspectState[aspect.n];
        return (
          <section key={aspect.n}>
            <p className="text-xs uppercase tracking-widest text-stone-600">Aspect {aspect.n} of {aspects.length}</p>
            <h2 className="font-serif mt-1">{aspect.title}</h2>
            <p className="mt-2 text-stone-700">{aspect.question}</p>
            <div className="mt-4">
              <AspectChooser
                aspect={aspect}
                stars={s.stars}
                onStarsChange={(stars) =>
                  setAspectState((prev) => ({ ...prev, [aspect.n]: { ...prev[aspect.n], stars } }))
                }
                comment={s.comment}
                onCommentChange={(comment) =>
                  setAspectState((prev) => ({ ...prev, [aspect.n]: { ...prev[aspect.n], comment } }))
                }
              />
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" className="btn btn-secondary" onClick={back}>
                {siteCopy.review.back}
              </button>
              <button
                type="button"
                className="btn"
                onClick={next}
                disabled={!aspectAdvanceable(aspect.n)}
              >
                {siteCopy.review.next}
              </button>
            </div>
          </section>
        );
      })()}

      {step === MISSING && (
        <section>
          <h2 className="font-serif">{siteCopy.missing.title}</h2>
          <p className="mt-2 text-stone-700">{siteCopy.missing.intro}</p>
          <div className="mt-4">
            <CheckboxGrid options={missingInfoOptions} value={missingChoices} onChange={setMissingChoices} />
          </div>
          <div className="mt-6">
            <label className="label" htmlFor="missing-comment">{siteCopy.missing.freeTextLabel}</label>
            <textarea
              id="missing-comment"
              className="textarea"
              maxLength={1200}
              placeholder={siteCopy.missing.freeTextPlaceholder}
              value={missingComment}
              onChange={(e) => setMissingComment(e.target.value.slice(0, 1200))}
            />
            <p className="helper">{missingComment.length}/1200</p>
          </div>
          <div className="mt-6">
            <label className="label" htmlFor="general-comment">{siteCopy.overall.generalLabel}</label>
            <textarea
              id="general-comment"
              className="textarea"
              maxLength={1200}
              placeholder={siteCopy.overall.generalPlaceholder}
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value.slice(0, 1200))}
            />
            <p className="helper">{generalComment.length}/1200</p>
          </div>
          {urbanScienceUrl && (
            <p className="mt-4 text-sm">
              <a href={urbanScienceUrl} target="_blank" rel="noopener noreferrer">
                {siteCopy.missing.urbanScienceLink}
              </a>
            </p>
          )}
          <div className="mt-6 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={back}>{siteCopy.review.back}</button>
            <button type="button" className="btn" onClick={next}>{siteCopy.review.next}</button>
          </div>
        </section>
      )}

      {step === UPLOAD && (
        <section>
          <h2 className="font-serif">{siteCopy.upload.title}</h2>
          <p className="mt-2 text-stone-700">{siteCopy.upload.body}</p>
          <p className="mt-2 helper">{siteCopy.upload.rules}</p>
          <div className="mt-4">
            <UploadDropzone publicToken={publicToken} consentShare={uploadShare} onChange={setUploads} />
          </div>
          {uploads.length > 0 && (
            <>
              <ConsentPanel label={siteCopy.upload.rightsConsent} checked={uploadRights} onChange={setUploadRights} />
              <ConsentPanel label={siteCopy.upload.shareConsent} checked={uploadShare} onChange={setUploadShare} />
            </>
          )}
          <div className="mt-6 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={back}>{siteCopy.review.back}</button>
            <button type="button" className="btn" onClick={next} disabled={uploads.length > 0 && !uploadRights}>
              {siteCopy.review.next}
            </button>
          </div>
        </section>
      )}

      {step === VALIDATION && (
        <section>
          <h2 className="font-serif">{siteCopy.validation.title}</h2>
          <div className="mt-4">
            <label className="label" htmlFor="postcode">{siteCopy.validation.postcodeLabel}</label>
            <input
              id="postcode" type="text" className="input" autoComplete="postal-code"
              value={postcode} onChange={(e) => setPostcode(e.target.value.slice(0, 20))}
              placeholder="SO23"
            />
            <p className="helper">{siteCopy.validation.postcodeHelper}</p>
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="email">{siteCopy.validation.emailLabel}</label>
            <input
              id="email" type="email" className="input" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value.slice(0, 254))}
              placeholder="you@example.com"
            />
            <p className="helper">{siteCopy.validation.emailHelper}</p>
            {email && (
              <ConsentPanel
                label={siteCopy.validation.emailConsent}
                checked={consentEmail} onChange={setConsentEmail} required
              />
            )}
          </div>
          <hr className="hr" />
          <ConsentPanel
            label={siteCopy.validation.shareCouncilConsent}
            checked={consentShareCouncil} onChange={setConsentShareCouncil}
          />
          <ConsentPanel
            label={siteCopy.validation.publicSummaryConsent}
            checked={consentPublicSummary} onChange={setConsentPublicSummary}
          />
          <div aria-hidden="true" style={{ position: "absolute", left: -10000, top: "auto" }}>
            <label>Leave blank<input value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
          </div>
          {turnstileSiteKey && (
            <div className="mt-4">
              <Turnstile sitekey={turnstileSiteKey} onToken={setTurnstileToken} />
            </div>
          )}
          {submitError && <p className="error mt-3">There was a problem ({submitError}). Please try again.</p>}
          <div className="mt-6 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={back} disabled={submitting}>
              {siteCopy.review.back}
            </button>
            <button
              type="button" className="btn"
              disabled={submitting || (email !== "" && !consentEmail)}
              onClick={submit}
            >
              {submitting ? siteCopy.validation.submitting : siteCopy.validation.submit}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
