import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Socialising, reinvented. Wurder is a live social game platform built around communication, strategy, and meaningful human interaction.",
  alternates: { canonical: "/product" },
};

const transformationPillars = [
  {
    title: "Strategic",
    copy: "Every interaction carries intent. Players read people, plan conversations, and decide when to act.",
  },
  {
    title: "Expansive",
    copy: "Wurder mixes groups naturally, helping people connect beyond familiar circles and usual cliques.",
  },
  {
    title: "Developmental",
    copy: "It builds confidence, listening, influence, and conversational agility through real-time social practice.",
  },
  {
    title: "Enjoyable",
    copy: "It keeps social energy high with playful tension, surprise, and memorable shared moments.",
  },
];

const outcomes = [
  {
    title: "More engagement",
    copy: "People participate actively instead of standing on the edge of the room.",
  },
  {
    title: "Better conversations",
    copy: "Interactions become intentional, curious, and genuinely social.",
  },
  {
    title: "Shared experiences",
    copy: "Groups leave with stories, inside moments, and stronger social memory.",
  },
  {
    title: "Real-time interaction",
    copy: "Wurder creates live, in-the-moment communication that digital feeds cannot replicate.",
  },
];

const fitContexts = [
  {
    title: "Parties",
    copy: "Turn casual gatherings into dynamic, social experiences with natural conversation flow.",
  },
  {
    title: "Events",
    copy: "Create structure and interaction at mixers, socials, and community meetups.",
  },
  {
    title: "Social groups",
    copy: "Bring fresh energy to clubs, societies, and recurring friend groups.",
  },
  {
    title: "Teams and workplaces",
    copy: "Use gameplay to develop communication and strengthen team connection in a practical way.",
  },
];

export default function ProductPage() {
  return (
    <div className="py-3 lg:py-2">
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#070910]/90 px-6 py-10 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:px-8 sm:py-12 lg:py-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_18%,rgba(217,106,90,0.2),transparent_45%),radial-gradient(circle_at_86%_8%,rgba(124,146,200,0.18),transparent_42%),linear-gradient(145deg,rgba(8,9,14,0.95),rgba(13,16,24,0.97))]" />
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/80">Wurder Product</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-[2.75rem]">
          Socialising, reinvented
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-100/85">
          Wurder is a live social game platform that transforms everyday conversation into a playful challenge of
          communication, influence, strategy, and social deception.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Link
            href="/join"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#f8d57e] via-[#e8b85d] to-[#b17f2f] px-5 text-sm font-semibold text-[#160f08] shadow-[0_10px_26px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            Join game
          </Link>
          <Link
            href="#how-wurder-transforms-socialising"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore how it works
          </Link>
        </div>
      </section>

      <section className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <div className="lg:grid lg:grid-cols-2 lg:divide-x lg:divide-white/10">
          <article className="border-b border-white/10 pb-6 sm:pb-7 lg:border-b-0 lg:pr-8">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">What Is Wurder</p>
            <h2 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">A social game played in the real world</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-100/82 sm:text-[0.96rem]">
              Wurder is designed for live environments where people speak, move, and interact face to face. It turns
              normal conversation into gameplay, where success depends on communication, strategic timing, and social
              awareness.
            </p>
          </article>

          <article className="pt-6 sm:pt-7 lg:pl-8 lg:pt-0">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">Why Wurder Exists</p>
            <h2 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">Bring people back into the room</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-100/82 sm:text-[0.96rem]">
              Too many social settings drift into passive habits: phones out, small familiar circles, limited
              engagement. Wurder exists to break that pattern by creating a reason to talk, listen, and connect with
              intention.
            </p>
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-100/82 sm:text-[0.96rem]">
              The result is a more open social environment where interaction feels natural, active, and human.
            </p>
          </article>
        </div>
      </section>

      <section id="how-wurder-transforms-socialising" className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">How Wurder Transforms Socialising</p>
        <h2 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">Four ways it changes the experience</h2>
        <div className="mt-4 border-y border-white/10 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-white/10">
          {transformationPillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className="grid gap-2.5 border-b border-white/10 py-4 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-6 sm:py-4.5 lg:px-5 lg:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <p className="text-lg font-semibold text-[#d9b873] sm:text-xl">
                {(index + 1).toString().padStart(2, "0")}
              </p>
              <div>
                <h3 className="text-lg font-semibold text-white">{pillar.title}</h3>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-100/80 sm:text-[0.96rem]">{pillar.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">What It Creates</p>
        <h2 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">Outcomes you can feel immediately</h2>
        <div className="mt-4 grid divide-y divide-white/10 border-y border-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
          {outcomes.map((outcome) => (
            <article key={outcome.title} className="py-3.5 pr-3 md:px-3 md:py-4">
              <h3 className="text-base font-semibold text-white">{outcome.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-100/80">{outcome.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 bg-gradient-to-r from-[#111b2c]/45 to-[#122435]/50 px-6 py-6 sm:mt-10 sm:px-8 sm:py-7">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-100/75">Why It Matters</p>
        <h2 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-[1.95rem]">More than a game</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-100/85 sm:text-base">
          Wurder creates the conditions for meaningful social confidence. It helps people communicate more openly,
          connect faster, and leave with stronger shared experiences rather than fragmented interactions.
        </p>
      </section>

      <section className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">Where It Fits</p>
        <h2 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">Designed for social spaces of all kinds</h2>
        <div className="mt-4 grid border-t border-white/10 md:grid-cols-2">
          {fitContexts.map((context) => (
            <article
              key={context.title}
              className="border-b border-white/10 py-4 pr-3 md:py-4.5 md:pr-6 [&:nth-child(2n)]:md:border-l [&:nth-child(2n)]:md:pl-6"
            >
              <h3 className="text-lg font-semibold text-white">{context.title}</h3>
              <p className="mt-1.5 max-w-[38ch] text-sm leading-relaxed text-slate-100/80 sm:text-[0.96rem]">{context.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <div className="bg-gradient-to-r from-[#0f1a2a]/65 to-[#123148]/70 px-6 py-7 sm:px-8 sm:py-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to reinvent socialising?</h2>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-100/85 sm:text-base">
            Start a live game now, explore how gameplay works, or run Wurder in team and workplace settings.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/join"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#f8d57e] via-[#e8b85d] to-[#b17f2f] px-5 text-sm font-semibold text-[#160f08] shadow-[0_10px_26px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Join game
            </Link>
            <Link
              href="/download"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Explore gameplay
            </Link>
            <Link
              href="/business"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#d9e6fb] to-[#9db8df] px-5 text-sm font-semibold text-[#0b1628] shadow-[0_10px_26px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Business use
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
