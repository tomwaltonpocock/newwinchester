import { Hero } from "@/components/Hero";
import { ContextCard } from "@/components/ContextCard";
import { siteCopy } from "@/content/siteCopy";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        {siteCopy.context.map((c) => (
          <ContextCard key={c.title} title={c.title} body={c.body} />
        ))}
      </section>
      <section className="mt-10 max-w-prose2">
        <p className="text-stone-700">{siteCopy.transparency}</p>
      </section>
    </div>
  );
}
