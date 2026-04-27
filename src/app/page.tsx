import { Hero } from "@/components/Hero";
import { ContextCard } from "@/components/ContextCard";
import { RecipientCard } from "@/components/RecipientCard";
import { siteCopy } from "@/content/siteCopy";
import { recipients } from "@/content/recipients";
import { env } from "@/lib/env";

export default function HomePage() {
  return (
    <div>
      <Hero />

      <div className="grid gap-8 lg:grid-cols-3 mt-10">
        <section className="lg:col-span-2">
          <h2 className="font-serif text-2xl">Three things this is for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {siteCopy.context.map((c) => (
              <ContextCard key={c.title} title={c.title} body={c.body} />
            ))}
          </div>
        </section>

        <aside className="lg:col-span-1">
          <h2 className="font-serif text-2xl">Speak to those who decide</h2>
          <p className="text-sm text-stone-700 mt-2">
            Send a civil, constructive message. Messages are screened, then forwarded.
          </p>
          <div className="mt-4 space-y-3">
            {recipients.map((r) => (
              <RecipientCard key={r.id} recipient={r} turnstileSiteKey={env.turnstile.siteKey} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
