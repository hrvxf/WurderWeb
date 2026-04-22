import Image from "next/image";
import Link from "next/link";
import StoreBadges from "@/components/store/StoreBadges";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Wurder",
    url: "https://wurder.app",
  };

  return (
    <div className="py-3">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden rounded-3xl border border-amber-100/15 bg-[#060709]/85 px-6 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.5)] sm:px-8 sm:py-12"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(199,53,93,0.22),transparent_52%),radial-gradient(circle_at_86%_8%,rgba(217,106,90,0.16),transparent_45%),linear-gradient(135deg,rgba(9,10,13,0.95),rgba(18,10,16,0.92)_45%,rgba(24,13,20,0.96))]" />
          <div className="absolute right-[-20%] top-[10%] h-72 w-72 rounded-full bg-amber-200/10 blur-3xl" />
          <div className="absolute bottom-[-18%] left-[-12%] h-72 w-72 rounded-full bg-[#C7355D]/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_14%,transparent_86%,rgba(255,255,255,0.03))]" />
        </div>

        <div className="grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <div className="max-w-3xl">
            <Image
              src="/wurder_gold.png"
              alt="Wurder"
              width={240}
              height={72}
              priority
              className="h-auto w-[170px] sm:w-[220px]"
            />
            <h1 id="hero-title" className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.35rem]">
              The real-world social deduction game.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85">
              Receive a secret target. Protect yourself. Trick your victim into saying the kill word before someone
              gets you first.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link
                href="/download"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-100/30 bg-gradient-to-b from-[#f8d57e] via-[#e8b85d] to-[#b17f2f] px-6 text-[0.95rem] font-bold tracking-wide text-[#160f08] shadow-[0_10px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
              >
                Download
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 text-[0.95rem] font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
              >
                How It Works
              </Link>
            </div>
            <StoreBadges location="home_hero" className="mt-4" />
          </div>

          <aside
            aria-label="Gameplay atmosphere"
            className="relative hidden border border-amber-100/20 bg-white/[0.03] p-5 backdrop-blur-sm lg:block"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-amber-100/75">Tonight&apos;s Briefing</p>
            <ul className="mt-4 divide-y divide-white/10 border-y border-white/10 text-sm text-white/90">
              <li className="py-3">You have one target.</li>
              <li className="py-3">One kill word ends them.</li>
              <li className="py-3">Stay alive to advance.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-wurder-works-title"
        className="relative mt-8 overflow-hidden border-t border-amber-100/15 pt-8 sm:mt-10 sm:pt-10"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_15%,rgba(199,53,93,0.1),transparent_48%),radial-gradient(circle_at_92%_4%,rgba(217,106,90,0.08),transparent_40%),linear-gradient(160deg,rgba(8,9,12,0.55),rgba(14,10,15,0.6))]" />
        </div>

        <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">How Wurder Works</p>
        <h2 id="how-wurder-works-title" className="mt-2.5 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
          How Wurder Works
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-[0.96rem]">
          A secret target. A hidden word. One chance to strike before someone gets you first.
        </p>

        <ol className="mt-4 divide-y divide-white/10 border-y border-white/10 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <li className="py-4 pr-4 lg:px-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/85">Step 1</p>
            <h3 className="mt-1.5 text-lg font-semibold">Receive Your Contract</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/85">
              Every player is assigned a secret target and a kill word.
            </p>
          </li>
          <li className="py-4 pr-4 lg:px-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/85">Step 2</p>
            <h3 className="mt-1.5 text-lg font-semibold">Commit a Wurder</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/85">
              Trick your target into saying the word without making them suspicious.
            </p>
          </li>
          <li className="py-4 pr-4 lg:px-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/85">Step 3</p>
            <h3 className="mt-1.5 text-lg font-semibold">Stay Alive</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/85">
              Someone else is hunting you at the same time, so every conversation matters.
            </p>
          </li>
          <li className="py-4 pr-4 lg:px-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/85">Step 4</p>
            <h3 className="mt-1.5 text-lg font-semibold">Confirm the Kill</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/85">
              When a kill is claimed, the victim confirms or disputes it to keep the game fair.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
