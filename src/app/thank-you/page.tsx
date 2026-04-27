import { siteCopy } from "@/content/siteCopy";
import { ThankYouActions } from "@/components/ThankYouActions";
import { env } from "@/lib/env";
import { getCouncilEmails, getCampaignInbox } from "@/content/contacts";

export const dynamic = "force-dynamic";

type Search = {
  t?: string;
  share?: string;
  pa?: string;
  pc?: string;
  tie?: string;
  ttl?: string;
};

export default function ThankYouPage({ searchParams }: { searchParams: Search }) {
  const publicToken = searchParams.t || "";
  const shareUrl = searchParams.share || null;
  const total = parseInt(searchParams.ttl || "0", 10) || 0;
  const altPref = parseInt(searchParams.pa || "0", 10) || 0;
  const currPref = parseInt(searchParams.pc || "0", 10) || 0;
  const tie = parseInt(searchParams.tie || "0", 10) || 0;

  const summaryLine =
    total > 0
      ? `preferred a citizen alternative on ${altPref} of ${total} aspects, preferred the current proposal on ${currPref}, tied or unrated ${tie}`
      : "[summary not available]";

  const subject = "Silver Hill / Central Winchester: resident feedback";
  const lines = [
    "Dear Winchester City Council and project team,",
    "",
    `I have just completed the Vision for Winchester visual review for Silver Hill / Central Winchester.`,
    "",
    "My main view:",
    summaryLine,
    "",
    "I believe the public should be shown clear, unmasked visuals and enough urban evidence to judge whether the scheme will strengthen Winchester for the long term.",
  ];
  if (shareUrl) {
    lines.push("", "My anonymised submission summary is here:", shareUrl);
  }
  lines.push("", "Yours sincerely,");
  const body = lines.join("\n");

  const recipients = getCouncilEmails();
  const bcc = getCampaignInbox();
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  if (bcc) params.set("bcc", bcc);
  const mailto = `mailto:${recipients.join(",")}?${params.toString()}`;

  return (
    <div>
      <h1 className="font-serif">{siteCopy.thankYou.title}</h1>
      <p className="mt-3 text-stone-700 max-w-prose2">{siteCopy.disclaimer}</p>
      <div className="mt-8">
        <ThankYouActions
          publicToken={publicToken}
          shareUrl={shareUrl}
          mailtoHref={mailto}
          siteUrl={env.siteUrl}
        />
      </div>
    </div>
  );
}
