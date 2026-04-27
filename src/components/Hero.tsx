import Link from "next/link";
import { siteCopy } from "@/content/siteCopy";

export function Hero() {
  return (
    <section className="full-bleed relative overflow-hidden" style={{ minHeight: "min(78vh, 760px)" }}>
      <div
        className="absolute inset-0 anim-hero-photo"
        aria-hidden="true"
        style={{
          backgroundColor: "#1f1812",
          backgroundImage: "url('/winchester.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(31,24,18,0.55) 0%, rgba(31,24,18,0.18) 38%, rgba(31,24,18,0.78) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 md:py-28 flex flex-col justify-end" style={{ minHeight: "inherit" }}>
        <p className="uppercase tracking-widest text-xs text-paper/85 anim-fade-in anim-d-100">
          {siteCopy.hero.kicker}
        </p>
        <h1 className="font-serif text-paper anim-fade-up anim-d-250 mt-3" style={{ textShadow: "0 1px 24px rgba(0,0,0,0.35)" }}>
          {siteCopy.hero.title}
        </h1>
        <p className="mt-5 max-w-prose2 text-lg md:text-xl text-paper/95 anim-fade-up anim-d-450">
          {siteCopy.hero.intro}
        </p>
        <div className="mt-8 anim-fade-up anim-d-650">
          <Link href="/review" className="btn-light">{siteCopy.hero.cta}</Link>
        </div>
        <p className="mt-10 max-w-prose2 text-xs text-paper/70 anim-fade-in anim-d-900">
          {siteCopy.disclaimer}
        </p>
      </div>
    </section>
  );
}
