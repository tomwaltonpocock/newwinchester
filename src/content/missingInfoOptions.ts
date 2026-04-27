export const missingInfoOptions = [
  "Full street-level views from all main approaches",
  "Unmasked elevations of every building",
  "Rooflines, plant, chimneys and roofscape",
  "Materials, brick, stone, metalwork and shopfront details",
  "Sunlight, shadow and wind impact",
  "Bus movement, servicing, deliveries and taxi access",
  "Independent footfall and retail-capacity analysis",
  "Housing mix and affordability",
  "Co-working, co-living and workspace strategy",
  "Public-space maintenance and long-term stewardship",
  "Night-time safety and lighting",
  "How developer selection and design choices were assessed",
  "Other",
] as const;

export type MissingInfoOption = (typeof missingInfoOptions)[number];
