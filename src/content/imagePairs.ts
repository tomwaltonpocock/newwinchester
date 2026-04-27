/**
 * Image pairs displayed during the review.
 *
 * To add or replace a pair:
 *   1. Drop two images in /public/pairs/<id>/ (developer.jpg, refined.jpg).
 *   2. Add an entry below with id, title, question and bullets.
 *   3. Keep developer alt-text and refined alt-text honest and specific.
 *
 * Real images should be aggressively optimised (WebP/JPEG, ≤300KB each).
 * Until real assets exist, the placeholders in /public/placeholders are used.
 */

export type ImagePair = {
  id: string;
  title: string;
  question: string;
  category: "street-edge" | "roofline" | "public-realm" | "other";
  developerImage: string;
  refinedImage: string;
  developerAlt: string;
  refinedAlt: string;
  whatToNotice?: string[];
};

export const imagePairs: ImagePair[] = [
  {
    id: "street-edge",
    title: "Street edge & shopfront rhythm",
    question:
      "Which feels like a Winchester street edge — one you would walk along?",
    category: "street-edge",
    developerImage: "/placeholders/developer-street.svg",
    refinedImage: "/placeholders/refined-street.svg",
    developerAlt:
      "Long uniform street frontage with large window panels and limited shopfront variation.",
    refinedAlt:
      "Finer-grain shopfront rhythm with traditional materials, varied bay widths and a clear pedestrian edge.",
    whatToNotice: [
      "Width and rhythm of shopfronts",
      "Material at ground floor: stone, brick, timber, glass",
      "How the building meets the pavement",
    ],
  },
  {
    id: "roofline",
    title: "Roofline & skyline",
    question:
      "Which roofline reads as Winchester rather than a generic city centre?",
    category: "roofline",
    developerImage: "/placeholders/developer-roof.svg",
    refinedImage: "/placeholders/refined-roof.svg",
    developerAlt:
      "Flat parapet roofline with rooftop plant visible and a uniform top to the building.",
    refinedAlt:
      "Articulated roofline with chimneys, varied ridge heights and roof forms appropriate to a historic city.",
    whatToNotice: [
      "Chimneys, dormers, ridge variation",
      "How the building meets the sky",
      "Visible plant, lift overruns or services",
    ],
  },
  {
    id: "public-realm",
    title: "Public space & public life",
    question:
      "Which public space looks like one residents will actually use through the year?",
    category: "public-realm",
    developerImage: "/placeholders/developer-public.svg",
    refinedImage: "/placeholders/refined-public.svg",
    developerAlt:
      "Open paved square with limited seating, exposed and lightly populated.",
    refinedAlt:
      "Smaller, sheltered public space with seating, planting, mixed activity and clear edges.",
    whatToNotice: [
      "Seating, shelter and shade",
      "Edges, doorways and active frontage",
      "Whether it works on a wet Tuesday in February",
    ],
  },
];
