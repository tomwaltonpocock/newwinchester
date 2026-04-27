/**
 * UK postcode parser tuned for civic validation use.
 *
 * Accepts:
 *   - outward only:           "SO23",  "so22"
 *   - outward + sector digit: "SO22 5", "SO225"
 *   - full postcode:          "SO23 9LJ", "so239lj"
 *
 * Returns normalised parts and a postcode_status tag relative to the
 * configured allowed-outwards list.
 */

// Outward formats (longest first so alternation prefers AA99 over AA9 etc.):
//   AA9A, AA99, A9A, AA9, A99, A9
const OUTWARD_BODY =
  "(?:[A-HK-Y][0-9][A-HJKSTUW]|[A-HK-Y][0-9]{2}|[0-9][A-HJKPS-UW]|[A-HK-Y][0-9]|[0-9]{2}|[0-9])";
const OUTWARD_RE = new RegExp(`^([A-PR-UWYZ]${OUTWARD_BODY})(?:\\s?([0-9]))?$`, "i");
const FULL_RE = new RegExp(
  `^(GIR\\s?0AA|([A-PR-UWYZ]${OUTWARD_BODY})\\s?([0-9][ABD-HJLNP-UW-Z]{2}))$`,
  "i"
);

export type PostcodeStatus =
  | "winchester_city"
  | "winchester_district_or_nearby"
  | "uk_other"
  | "invalid_or_missing";

export type ParsedPostcode = {
  normalized: string | null;
  outward: string | null;
  sector: string | null;
  full: string | null;
  status: PostcodeStatus;
};

const WINCHESTER_CITY = new Set(["SO22", "SO23"]);
const WINCHESTER_DISTRICT_NEARBY = new Set([
  "SO20", "SO21", "SO24", "SO30", "SO31", "SO32", "SO50", "SO51", "SO52", "SO53",
  "PO7", "PO8", "PO17",
  "GU34", "GU30", "GU31", "GU32", "GU33",
  "RG24", "RG25", "RG28", "RG29",
]);

export function parsePostcode(
  input: string | null | undefined,
  allowedOutwards: string[] = ["SO22", "SO23"]
): ParsedPostcode {
  if (!input) {
    return empty("invalid_or_missing");
  }
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, " ");

  // Special-case: GIR 0AA.
  if (/^GIR\s?0AA$/i.test(cleaned)) {
    return {
      normalized: "GIR 0AA",
      outward: "GIR",
      sector: "GIR 0",
      full: "GIR 0AA",
      status: "uk_other",
    };
  }

  // Try full postcode first.
  const fullMatch = cleaned.replace(/\s+/g, "").match(/^([A-PR-UWYZ][A-Z0-9]{1,3})([0-9][A-Z]{2})$/i);
  if (fullMatch && FULL_RE.test(cleaned)) {
    const outward = fullMatch[1].toUpperCase();
    const inward = fullMatch[2].toUpperCase();
    const sector = `${outward} ${inward[0]}`;
    return {
      normalized: `${outward} ${inward}`,
      outward,
      sector,
      full: `${outward} ${inward}`,
      status: classify(outward, allowedOutwards),
    };
  }

  // Try outward / outward + sector digit. Strip whitespace first because the
  // regex allows an optional space between outward and sector digit.
  const out = cleaned.match(OUTWARD_RE);
  if (out) {
    const outward = out[1].toUpperCase();
    const sectorDigit = out[2];
    return {
      normalized: sectorDigit ? `${outward} ${sectorDigit}` : outward,
      outward,
      sector: sectorDigit ? `${outward} ${sectorDigit}` : null,
      full: null,
      status: classify(outward, allowedOutwards),
    };
  }

  return empty("invalid_or_missing");
}

function empty(status: PostcodeStatus): ParsedPostcode {
  return { normalized: null, outward: null, sector: null, full: null, status };
}

function classify(outward: string, allowed: string[]): PostcodeStatus {
  const up = outward.toUpperCase();
  const allowedSet = new Set(allowed.map((a) => a.toUpperCase()));
  if (allowedSet.has(up) || WINCHESTER_CITY.has(up)) return "winchester_city";
  if (WINCHESTER_DISTRICT_NEARBY.has(up)) return "winchester_district_or_nearby";
  return "uk_other";
}
