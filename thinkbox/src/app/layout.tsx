import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thinkbox",
  description: "Your inbox, one level up.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf9f7",
};

const nav = [
  { href: "/", label: "Decisions" },
  { href: "/people", label: "People" },
  { href: "/review", label: "Review" },
  { href: "/noise", label: "Noise" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-3xl px-4 pb-24">
          <header className="flex items-baseline justify-between pt-6 pb-4">
            <Link href="/" className="font-serif text-2xl tracking-tight">
              Thinkbox
            </Link>
            <nav className="flex gap-4 text-sm text-muted">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
