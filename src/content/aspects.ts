import { generatedAspects, type GeneratedAspect } from "./aspects.generated";

/**
 * Optional metadata per aspect number. Anything not listed here gets
 * sensible defaults so the app works the moment you drop image files in
 * `public/aspects/`.
 *
 * To customise an aspect, add an entry keyed by the aspect number.
 * `developerAlt` and `altDescriptions` should be honest descriptions of
 * what is in the image (used as alt-text and shown in the admin export).
 */
export type AspectMeta = {
  title: string;
  question: string;
  category?: string;
  developerAlt?: string;
  altDescriptions?: { [k in 1 | 2 | 3]?: string };
  whatToNotice?: string[];
};

const meta: Record<number, AspectMeta> = {
  // 1: {
  //   title: "Street edge",
  //   question: "Which feels right for Winchester?",
  //   developerAlt: "Long uniform frontage with limited shopfront variation.",
  //   altDescriptions: { 1: "Finer-grain shopfront rhythm with traditional materials." },
  //   whatToNotice: ["Material at ground floor", "Shopfront width", "How the building meets the pavement"],
  // },
};

const DEFAULT_QUESTION = "Which feels right for Winchester?";

export type Aspect = {
  n: number;
  title: string;
  question: string;
  category?: string;
  developerAlt: string;
  altDescriptions: { [k in 1 | 2 | 3]?: string };
  whatToNotice: string[];
  paths: GeneratedAspect["paths"];
  altIndices: (1 | 2 | 3)[];
};

export const aspects: Aspect[] = generatedAspects.map((g) => {
  const m = meta[g.n] ?? {};
  const altIndices: (1 | 2 | 3)[] = [];
  if (g.paths[1]) altIndices.push(1);
  if (g.paths[2]) altIndices.push(2);
  if (g.paths[3]) altIndices.push(3);
  return {
    n: g.n,
    title: m.title ?? `Aspect ${g.n}`,
    question: m.question ?? DEFAULT_QUESTION,
    category: m.category,
    developerAlt: m.developerAlt ?? `Current proposal for aspect ${g.n}.`,
    altDescriptions: m.altDescriptions ?? {},
    whatToNotice: m.whatToNotice ?? [],
    paths: g.paths,
    altIndices,
  };
});
