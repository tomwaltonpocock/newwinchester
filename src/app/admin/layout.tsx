import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="flex flex-wrap gap-4 text-sm border-b border-stone-200 pb-3 mb-6">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/aspects">Aspects</Link>
        <Link href="/admin/missing-info">Missing info</Link>
        <Link href="/admin/uploads">Uploads</Link>
        <Link href="/admin/contact">Contact</Link>
        <Link href="/admin/export">Export</Link>
        <Link href="/admin/report">Report</Link>
        <Link href="/admin/methodology">Methodology</Link>
      </nav>
      {children}
    </div>
  );
}
