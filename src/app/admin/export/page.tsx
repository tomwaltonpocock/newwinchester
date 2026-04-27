export const dynamic = "force-dynamic";

export default function ExportPage() {
  const links: { href: string; label: string; note?: string }[] = [
    { href: "/api/admin/export?type=submissions", label: "Submissions CSV", note: "All fields, internal columns included." },
    { href: "/api/admin/export?type=aspects", label: "Aspect responses CSV" },
    { href: "/api/admin/export?type=comments", label: "Comments CSV" },
    { href: "/api/admin/export?type=missing", label: "Missing-info CSV" },
    {
      href: "/api/admin/export?type=council",
      label: "Council summary CSV",
      note: "Excludes raw email/IP/participant/UA hashes. Only submissions where consent_share_council=true.",
    },
  ];
  return (
    <div>
      <h1 className="font-serif">Export</h1>
      <ul className="mt-6 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="btn btn-secondary inline-block">
              {l.label}
            </a>
            {l.note && <p className="helper mt-1">{l.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
