import Link from "next/link";
import { siteCopy } from "@/content/siteCopy";

export function Hero() {
  return (
    <section className="py-10 md:py-14">
      <p className="uppercase tracking-widest text-xs text-stone-600 mb-3">
        {siteCopy.hero.kicker}
      </p>
      <h1 className="font-serif">{siteCopy.hero.title}</h1>
      <p className="mt-5 max-w-prose2 text-lg text-stone-700">
        {siteCopy.hero.intro}
      </p>
      <div className="mt-8">
        <Link href="/review" className="btn">
          {siteCopy.hero.cta}
        </Link>
      </div>
      <p className="mt-6 max-w-prose2 text-xs text-stone-600">
        {siteCopy.disclaimer}
      </p>
    </section>
  );
}
