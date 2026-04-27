/**
 * People who residents can message via the platform.
 *
 * Real email addresses live in environment variables, not in this file.
 * Each recipient has `envEmailKey` — the name of the env var that holds
 * their email (set in Vercel project settings).
 *
 * Drop their photo at the path in `imagePath`. Default placeholders are
 * SVG initials in /public/people/. Replace with .jpg or .png and update
 * the `imagePath` accordingly.
 */
export type Recipient = {
  id: string;
  name: string;
  role: string;
  organisation: string;
  imagePath: string;
  envEmailKey: string;
};

export const recipients: Recipient[] = [
  {
    id: "martin-tod",
    name: "Martin Tod",
    role: "Leader of Winchester City Council",
    organisation: "Winchester City Council",
    imagePath: "/people/martin-tod.svg",
    envEmailKey: "RECIPIENT_MARTIN_TOD_EMAIL",
  },
  {
    id: "matt-woolgar",
    name: "Matt Woolgar",
    role: "Development Director",
    organisation: "igloo Regeneration",
    imagePath: "/people/matt-woolgar.svg",
    envEmailKey: "RECIPIENT_MATT_WOOLGAR_EMAIL",
  },
];

export function getRecipient(id: string): Recipient | null {
  return recipients.find((r) => r.id === id) ?? null;
}

export function getRecipientEmail(r: Recipient): string | null {
  const v = process.env[r.envEmailKey];
  if (!v || !v.includes("@")) return null;
  return v.trim();
}
