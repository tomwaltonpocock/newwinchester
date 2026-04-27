export const siteCopy = {
  brand: {
    name: "Vision for Winchester",
    subtitle: "Future of Silver Hill",
  },
  hero: {
    title: "Vision for Winchester",
    kicker: "Future of Silver Hill",
    intro:
      "Silver Hill will shape the centre of Winchester for decades. This citizen-led review lets residents compare the visuals, say what feels right, and ask what still needs to be shown.",
    cta: "Start the visual review",
  },
  context: [
    {
      title: "Why this matters",
      body:
        "Winchester has waited a generation for this part of the city to be resolved. The result will affect footfall, hospitality, homes, workspaces, streets, visitors and the daily character of the city.",
    },
    {
      title: "Clearer public evidence",
      body:
        "Residents should be able to see the choices plainly: street edges, materials, rooflines, shopfronts, public space, and the buildings that may be hidden behind more flattering views.",
    },
    {
      title: "Beyond style",
      body:
        "A beautiful city also needs urban judgement: the right mix of homes, retail, workspace, co-working, co-living, density, movement, sunlight, servicing and long-term resilience.",
    },
  ],
  transparency:
    "Developers and councils must balance viability, programme and risk. Residents have an equally serious test: will this become a durable, useful, beautiful place that strengthens Winchester for generations?",
  disclaimer:
    "This is an independent public-feedback tool, not an official Winchester City Council consultation. The alternative images are illustrative prompts for comparison, not technical planning drawings.",
  review: {
    explainerTitle: "How this works",
    explainerBody:
      "You will compare a few image pairs and choose which feels right. After each, you can write a short note if you want. It takes about 90 seconds; longer only if you choose. Nothing is shared with anyone unless you ask for it to be.",
    pairChoosePrompt: "Which feels right for Winchester?",
    optionA: "Option A",
    optionB: "Option B",
    preferA: "Prefer A",
    preferB: "Prefer B",
    noPreference: "No clear preference",
    sayWhy: "Say why, if you want",
    tapToEnlarge: "Tap to enlarge",
    closeModal: "Close",
    next: "Continue",
    back: "Back",
  },
  overall: {
    title: "Overall view",
    olderQuestion:
      "How do you rate the previous/older approach, if you know it?",
    currentQuestion: "How do you rate the current developer direction?",
    refinedQuestion: "How do you rate the citizen-refined direction?",
    notSure: "Not sure",
    generalLabel:
      "Anything else Winchester should be told before this moves forward?",
    generalPlaceholder: "Optional. Up to 1200 characters.",
  },
  missing: {
    title: "What still needs to be shown?",
    intro:
      "Some of the most important design questions are about what is not yet clearly visible. Choose the information you most want released or explained.",
    freeTextLabel:
      "Which hidden view, building or decision worries you most?",
    freeTextPlaceholder: "Optional. Up to 1200 characters.",
    urbanScienceLink: "Read / add an urban-science note for Winchester",
  },
  upload: {
    title: "Have a better idea?",
    body:
      "Optional: upload up to two images you have made or found useful. Please only upload images you have rights to share. Do not upload photos of private individuals or anything confidential.",
    rightsConsent: "I confirm I have the right to share these image(s).",
    shareConsent:
      "I am happy for these image(s) to be shared with the Council/development team as part of my submission.",
    rules:
      "JPEG, PNG or WebP. Max 2 files. Each will be compressed in your browser before upload.",
  },
  validation: {
    title: "Almost done",
    postcodeLabel: "Postcode or postcode area",
    postcodeHelper:
      "Used only to understand whether responses are local. You can enter SO23, SO22 5, or a full postcode; we store only the postcode area/sector needed for validation.",
    emailLabel: "Email me updates or meeting dates",
    emailHelper:
      "Optional. We use double opt-in: you’ll get a confirmation email before anything else.",
    emailConsent:
      "I agree to receive occasional updates about Silver Hill / Vision for Winchester, including meeting dates. I can unsubscribe at any time.",
    shareCouncilConsent:
      "I am happy for my anonymised submission to be shared with the Council/development team.",
    publicSummaryConsent:
      "I am happy for my anonymised comments to be included in a public summary report.",
    submit: "Submit my view",
    submitting: "Submitting…",
  },
  thankYou: {
    title: "Thank you — your view has been recorded.",
    emailDecisionMakers: {
      title: "Email decision-makers",
      body:
        "Open a draft email in your own email app, prefilled. You decide whether to send it.",
      button: "Open email draft",
    },
    share: {
      title: "Share this review",
      body:
        "If you think this matters, please pass it on — to neighbours, friends, anyone who lives in or cares about Winchester.",
      copy: "Copy share link",
      shareText:
        "I’ve just compared the Silver Hill visuals. Add your view here:",
    },
    stayUpdated: {
      title: "Stay updated",
      body:
        "We’ll write occasionally with meeting dates and progress, never more than that.",
      button: "Subscribe",
    },
  },
  contact: {
    title: "Contact",
    body:
      "For volume reasons, please use the form rather than sending long attachments. We read every message, but individual replies may not always be possible.",
    categories: [
      "Media",
      "I can help",
      "Event / meeting",
      "Technical problem",
      "Privacy / data request",
      "Other",
    ],
    nameLabel: "Your name (optional)",
    emailLabel: "Email (required if you’d like a reply)",
    messageLabel: "Message",
    submit: "Send",
    success:
      "Thanks — this inbox is being triaged. We read every message but may not be able to reply individually.",
  },
  footer: {
    rights: "Vision for Winchester — citizen-led, independent.",
  },
} as const;

export type SiteCopy = typeof siteCopy;
