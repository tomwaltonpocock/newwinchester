import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { siteCopy } from "@/content/siteCopy";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: {
    default: `${siteCopy.brand.name}: ${siteCopy.brand.subtitle}`,
    template: `%s · ${siteCopy.brand.name}`,
  },
  description: "Compare the Silver Hill visuals and add your view.",
  metadataBase: env.siteUrl ? new URL(env.siteUrl) : undefined,
  manifest: "/manifest.json",
  openGraph: {
    title: `${siteCopy.brand.name}: ${siteCopy.brand.subtitle}`,
    description: "Compare the Silver Hill visuals and add your view.",
    images: [{ url: "/og-image.png" }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1f1812",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:px-3 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <header className="border-b border-stone-200 bg-paper">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="no-underline">
              <span className="font-serif text-lg font-semibold tracking-tightish text-ink">
                {siteCopy.brand.name}
              </span>
              <span className="block text-xs text-stone-600">
                {siteCopy.brand.subtitle}
              </span>
            </Link>
            <nav className="text-sm flex gap-4">
              <Link href="/review" className="no-underline text-ink hover:underline">
                Review
              </Link>
              <Link href="/contact" className="no-underline text-ink hover:underline">
                Contact
              </Link>
            </nav>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-5xl px-4 pb-16 pt-6">
          {children}
        </main>

        <footer className="border-t border-stone-200 mt-12 py-8 text-sm text-stone-600">
          <div className="mx-auto max-w-5xl px-4 flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span>{siteCopy.footer.rights}</span>
            <nav className="flex gap-4">
              <Link href="/privacy">Privacy</Link>
              <Link href="/cookies">Cookies</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
