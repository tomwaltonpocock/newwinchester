"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImagePair } from "@/content/imagePairs";
import { siteCopy } from "@/content/siteCopy";
import { missingInfoOptions } from "@/content/missingInfoOptions";
import { ProgressBar } from "./ProgressBar";
import { ImageComparePair, type Side } from "./ImageComparePair";
import { PreferenceButtons } from "./PreferenceButtons";
import { OptionalComment } from "./OptionalComment";
import { RatingGroup } from "./RatingGroup";
import { CheckboxGrid } from "./CheckboxGrid";
import { ConsentPanel } from "./ConsentPanel";
import { UploadDropzone, type UploadedFile } from "./UploadDropzone";
import { Turnstile } from "./Turnstile";

type Pref = "left" | "right" | "no_preference";
type PairState = {
  preference: Pref | null;
  comment: string;
  leftKind: "developer" | "refined";
  rightKind: "developer" | "refined";
  pairOrder: number;
};
type Rating = 1 | 2 | 3 | 4 | 5 | null;

const STORAGE_KEY = "vfw:flow:v1";
const PARTICIPANT_KEY = "vfw:participant:v1";

function getParticipantToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem(PARTICIPANT_KEY);
  if (!t) {
    t = crypto.randomUUID() + "-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(PARTICIPANT_KEY, t);
  }
  return t;
}

export function ReviewFlow({
  pairs,
  showImageSources,
  turnstileSiteKey,
  urbanScienceUrl,
}: {
  pairs: ImagePair[];
  showImageSources: boolean;
  turnstileSiteKey: string;
  urbanScienceUrl: string;
}) {
  const router = useRouter();
  const totalSteps = 1 + pairs.length + 4; // explainer + pairs + missing + overall + upload + validation
  const [step, setStep] = useState(0);

  // Pair state — initialised once with random left/right ordering per participant.
  const [pairState, setPairState] = useState<Record<string, PairState>>(() => {
    const out: Record<string, PairState> = {};
    pairs.forEach((p, i) => {
      const flip = Math.random() < 0.5;
      out[p.id] = {
        preference: null,
        comment: "",
        leftKind: flip ? "developer" : "refined",
        rightKind: flip ? "refined" : "developer",
        pairOrder: i,
      };
    });
    return out;
  });

  const [overall, setOverall] = useState({
    older: null as Rating,
    current: null as Rating,
    refined: null as Rating,
    generalComment: "",
  });
  const [missingChoices, setMissingChoices] = useState<string[]>([]);
  const [missingComment, setMissingComment] = useState("");
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploadRights, setUploadRights] = useState(false);
  const [uploadShare, setUploadShare] = useState(false);

  const [postcode, setPostcode] = useState("");
  const [email, setEmail] = useState("");
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentShareCouncil, setConsentShareCouncil] = useState(false);
  const [consentPublicSummary, setConsentPublicSummary] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // must remain empty

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Restore from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.pairState) setPairState(data.pairState);
        if (data.overall) setOverall(data.overall);
        if (data.missingChoices) setMissingChoices(data.missingChoices);
        if (data.missingComment) setMissingComment(data.missingComment);
        if (data.postcode) setPostcode(data.postcode);
        if (data.email) setEmail(data.email);
        if (data.consentEmail !== undefined) setConsentEmail(data.consentEmail);
        if (data.consentShareCouncil !== undefined) setConsentShareCouncil(data.consentShareCouncil);
        if (data.consentPublicSummary !== undefined) setConsentPublicSummary(data.consentPublicSummary);
      }
    } catch {}
  }, []);

  // Save progress.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pairState,
          overall,
          missingChoices,
          missingComment,
          postcode,
          email,
          consentEmail,
          consentShareCouncil,
          consentPublicSummary,
        })
      );
    } catch {}
  }, [pairState, overall, missingChoices, missingComment, postcode, email, consentEmail, consentShareCouncil, consentPublicSummary]);

  // Start a submission once we hit the first pair.
  useEffect(() => {
    if (startedRef.current) return;
    if (step < 1) return;
    startedRef.current = true;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const source = url.searchParams.get("source") || (document.referrer ? "referral" : "direct");
        const utmEntries: [string, string][] = [];
        for (const [k, v] of url.searchParams.entries()) {
          if (k.toLowerCase().startsWith("utm_")) utmEntries.push([k, v.slice(0, 100)]);
        }
        const res = await fetch("/api/submissions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantToken: getParticipantToken(),
            source,
            referrer: document.referrer || null,
            utm: Object.fromEntries(utmEntries),
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

  const pairsArrayState = useMemo(
    () =>
      pairs.map((p) => ({
        imagePairId: p.id,
        pairOrder: pairState[p.id].pairOrder,
        leftKind: pairState[p.id].leftKind,
        rightKind: pairState[p.id].rightKind,
        preference: mapPref(pairState[p.id].preference, pairState[p.id].leftKind, pairState[p.id].rightKind),
        comment: pairState[p.id].comment || null,
      })),
    [pairs, pairState]
  );

  const allPairsAnswered = pairs.every((p) => pairState[p.id].preference !== null);

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
          pairs: pairsArrayState,
          overall,
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
      // Clear progress, keep participant token.
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      const params = new URLSearchParams();
      params.set("t", data.publicToken);
      if (data.shareUrl) params.set("share", data.shareUrl);
      if (data.summary) {
        params.set("pr", String(data.summary.preferredRefined));
        params.set("pd", String(data.summary.preferredDeveloper));
        params.set("np", String(data.summary.noPreference));
        params.set("ttl", String(data.summary.total));
      }
      router.push(`/thank-you?${params.toString()}`);
    } catch (e) {
      setSubmitError("network_error");
    } finally {
      setSubmitting(false);
    }
  }

  // Step rendering.
  const stepIndex = step;
  const PAIR_OFFSET = 1;
  const MISSING = PAIR_OFFSET + pairs.length;
  const OVERALL = MISSING + 1;
  const UPLOAD = OVERALL + 1;
  const VALIDATION = UPLOAD + 1;

  return (
    <div>
      <ProgressBar step={step + 1} total={totalSteps} />

      {step === 0 && (
        <section>
          <h2 className="font-serif">{siteCopy.review.explainerTitle}</h2>
          <p className="mt-3 text-stone-700">{siteCopy.review.explainerBody}</p>
          <div className="mt-6 flex justify-end">
            <button type="button" className="btn" onClick={next}>
              {siteCopy.review.next}
            </button>
          </div>
        </section>
      )}

      {step >= PAIR_OFFSET && step < MISSING && (() => {
        const idx = step - PAIR_OFFSET;
        const pair = pairs[idx];
        const ps = pairState[pair.id];
        return (
          <section key={pair.id}>
            <h2 className="font-serif">{pair.title}</h2>
            <p className="mt-2 text-stone-700">{pair.question}</p>
            <div className="mt-4">
              <ImageComparePair
                pair={pair}
                leftKind={ps.leftKind}
                rightKind={ps.rightKind}
                showSources={showImageSources}
              />
            </div>
            <PreferenceButtons
              value={ps.preference}
              onChange={(v) =>
                setPairState((prev) => ({
                  ...prev,
                  [pair.id]: { ...prev[pair.id], preference: v },
                }))
              }
            />
            {ps.preference && (
              <OptionalComment
                label={siteCopy.review.sayWhy}
                placeholder="Optional. Up to 900 characters."
                maxLength={900}
                value={ps.comment}
                onChange={(v) =>
                  setPairState((prev) => ({
                    ...prev,
                    [pair.id]: { ...prev[pair.id], comment: v },
                  }))
                }
              />
            )}
            <div className="mt-6 flex justify-between">
              <button type="button" className="btn btn-secondary" onClick={back}>
                {siteCopy.review.back}
              </button>
              <button
                type="button"
                className="btn"
                onClick={next}
                disabled={ps.preference === null}
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
            <CheckboxGrid
              options={missingInfoOptions}
              value={missingChoices}
              onChange={setMissingChoices}
            />
          </div>
          <div className="mt-6">
            <label className="label" htmlFor="missing-comment">
              {siteCopy.missing.freeTextLabel}
            </label>
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
          {urbanScienceUrl && (
            <p className="mt-4 text-sm">
              <a href={urbanScienceUrl} target="_blank" rel="noopener noreferrer">
                {siteCopy.missing.urbanScienceLink}
              </a>
            </p>
          )}
          <div className="mt-6 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={back}>
              {siteCopy.review.back}
            </button>
            <button type="button" className="btn" onClick={next}>
              {siteCopy.review.next}
            </button>
          </div>
        </section>
      )}

      {step === OVERALL && (
        <section>
          <h2 className="font-serif">{siteCopy.overall.title}</h2>
          <RatingGroup
            question={siteCopy.overall.olderQuestion}
            value={overall.older}
            onChange={(v) => setOverall((o) => ({ ...o, older: v }))}
            name="older"
          />
          <RatingGroup
            question={siteCopy.overall.currentQuestion}
            value={overall.current}
            onChange={(v) => setOverall((o) => ({ ...o, current: v }))}
            name="current"
          />
          <RatingGroup
            question={siteCopy.overall.refinedQuestion}
            value={overall.refined}
            onChange={(v) => setOverall((o) => ({ ...o, refined: v }))}
            name="refined"
          />
          <div className="mt-4">
            <label className="label" htmlFor="general-comment">
              {siteCopy.overall.generalLabel}
            </label>
            <textarea
              id="general-comment"
              className="textarea"
              maxLength={1200}
              placeholder={siteCopy.overall.generalPlaceholder}
              value={overall.generalComment}
              onChange={(e) => setOverall((o) => ({ ...o, generalComment: e.target.value.slice(0, 1200) }))}
            />
            <p className="helper">{overall.generalComment.length}/1200</p>
          </div>
          <div className="mt-6 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={back}>
              {siteCopy.review.back}
            </button>
            <button type="button" className="btn" onClick={next}>
              {siteCopy.review.next}
            </button>
          </div>
        </section>
      )}

      {step === UPLOAD && (
        <section>
          <h2 className="font-serif">{siteCopy.upload.title}</h2>
          <p className="mt-2 text-stone-700">{siteCopy.upload.body}</p>
          <p className="mt-2 helper">{siteCopy.upload.rules}</p>

          <div className="mt-4">
            <UploadDropzone
              publicToken={publicToken}
              consentShare={uploadShare}
              onChange={setUploads}
            />
          </div>
          {uploads.length > 0 && (
            <>
              <ConsentPanel
                label={siteCopy.upload.rightsConsent}
                checked={uploadRights}
                onChange={setUploadRights}
              />
              <ConsentPanel
                label={siteCopy.upload.shareConsent}
                checked={uploadShare}
                onChange={setUploadShare}
              />
            </>
          )}
          <div className="mt-6 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={back}>
              {siteCopy.review.back}
            </button>
            <button
              type="button"
              className="btn"
              onClick={next}
              disabled={uploads.length > 0 && !uploadRights}
            >
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
              id="postcode"
              type="text"
              className="input"
              autoComplete="postal-code"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.slice(0, 20))}
              placeholder="SO23"
            />
            <p className="helper">{siteCopy.validation.postcodeHelper}</p>
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="email">{siteCopy.validation.emailLabel}</label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 254))}
              placeholder="you@example.com"
            />
            <p className="helper">{siteCopy.validation.emailHelper}</p>
            {email && (
              <ConsentPanel
                label={siteCopy.validation.emailConsent}
                checked={consentEmail}
                onChange={setConsentEmail}
                required
              />
            )}
          </div>

          <hr className="hr" />

          <ConsentPanel
            label={siteCopy.validation.shareCouncilConsent}
            checked={consentShareCouncil}
            onChange={setConsentShareCouncil}
          />
          <ConsentPanel
            label={siteCopy.validation.publicSummaryConsent}
            checked={consentPublicSummary}
            onChange={setConsentPublicSummary}
          />

          {/* Honeypot — must stay empty */}
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
              type="button"
              className="btn"
              disabled={submitting || (email !== "" && !consentEmail) || !allPairsAnswered}
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

function mapPref(
  side: Pref | null,
  leftKind: "developer" | "refined",
  rightKind: "developer" | "refined"
): "developer" | "refined" | "no_preference" | null {
  if (side === null) return null;
  if (side === "no_preference") return "no_preference";
  return side === "left" ? leftKind : rightKind;
}
