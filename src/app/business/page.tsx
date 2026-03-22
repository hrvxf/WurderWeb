import type { Metadata } from "next";
import Link from "next/link";
import { gameModeOptions } from "@/lib/company-game/companyGameOptions";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

export const metadata: Metadata = {
  title: "Business",
  description:
    "Wurder Business is an interactive team session that strengthens communication and team dynamics with measurable insights.",
  alternates: { canonical: "/business" },
};

const useCases = [
  {
    title: "Team building",
    copy: "Run structured social gameplay that gets people collaborating across teams.",
  },
  {
    title: "Communication skills development",
    copy: "Give teams practice in active listening, clarity, and conversational strategy.",
  },
  {
    title: "Friendly competition with measurable outcomes",
    copy: "Drive engagement with lightweight competition backed by clear performance signals.",
  },
];

const howItWorksSteps = [
  "Create a session",
  "Share the join code / QR code with participants",
  "Run the session",
  "Review insights",
];

const insightPreview = [
  { label: "Kills", value: "24" },
  { label: "Accuracy", value: "81%" },
  { label: "Conversations initiated", value: "179" },
  { label: "Engagement rate", value: "93%" },
];

export default function BusinessPage() {
  return (
    <div className="py-3">
      <section
        aria-labelledby="business-hero-title"
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#05080f]/90 px-6 py-10 shadow-[0_28px_80px_rgba(0,0,0,0.45)] sm:px-8 sm:py-12"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(77,120,195,0.2),transparent_46%),radial-gradient(circle_at_86%_18%,rgba(122,147,176,0.18),transparent_46%),linear-gradient(140deg,rgba(6,10,18,0.95),rgba(10,15,26,0.96))]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_22%,transparent_78%,rgba(255,255,255,0.04))]" />
        </div>

        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/80">Wurder Business</p>
        <h1 id="business-hero-title" className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-[2.8rem]">
          Build stronger teams through live communication challenges.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-100/85">
          Wurder Business turns team building into an interactive session that surfaces communication behaviors in real
          time, then gives managers measurable insights they can use immediately.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Link
            href={BUSINESS_ROUTES.createSession}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#d9e6fb] to-[#9db8df] px-5 text-sm font-semibold text-[#0b1628] shadow-[0_10px_26px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08101d]"
          >
            Start session
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08101d]"
          >
            See how it works
          </Link>
        </div>
      </section>

      <section aria-labelledby="business-use-cases-title" className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">Use Cases</p>
        <h2 id="business-use-cases-title" className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Use cases
        </h2>
        <div className="mt-4 border-y border-white/10 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-white/10">
          {useCases.map((item) => (
            <article key={item.title} className="border-b border-white/10 py-4 pr-4 lg:border-b-0 lg:px-5">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-100/80">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="business-modes-title" className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">Session Types</p>
        <h2 id="business-modes-title" className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Game modes
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-100/80 sm:text-[0.96rem]">
          Choose the session type that best matches the team capability you want to develop.
        </p>
        <div className="mt-4 border-y border-white/10 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-white/10">
          {gameModeOptions.map((mode) => (
            <article key={mode.value} className="border-b border-white/10 py-4 pr-4 lg:border-b-0 lg:px-5">
              <h3 className="text-lg font-semibold text-white">{mode.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-100/80">{mode.practicalDescription}</p>
            </article>
          ))}
        </div>
        <p className="mt-3 border-l-2 border-slate-300/30 pl-3 text-xs text-slate-100/75">
          {gameModeOptions[0]?.analyticsNote}
        </p>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="business-how-it-works-title"
        className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10"
      >
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">Process</p>
        <h2 id="business-how-it-works-title" className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-4 divide-y divide-white/10 border-y border-white/10 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {howItWorksSteps.map((step, index) => (
            <li key={step} className="py-4 pr-4 lg:px-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-200/75">Step {index + 1}</p>
              <p className="mt-1.5 text-base font-medium text-white">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="business-insights-title"
        className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10"
      >
        <p className="text-xs uppercase tracking-[0.22em] text-slate-200/75">Product Preview</p>
        <h2 id="business-insights-title" className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          Manager insights preview
        </h2>
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-100/80 sm:text-[0.96rem]">
          Example dashboard metrics from a session. This is a preview of reporting output, not live data.
        </p>
        <div className="mt-4 grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {insightPreview.map((metric) => (
            <article key={metric.label} className="py-4 pr-4 sm:px-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-200/70">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{metric.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
        <div className="bg-gradient-to-r from-[#0b1525]/75 to-[#0c1f31]/75 px-6 py-7 sm:px-8 sm:py-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to run your first Wurder Business session?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-100/85 sm:text-base">
          Launch in minutes, invite participants instantly, and capture measurable communication outcomes.
        </p>
        <div className="mt-5">
          <Link
            href={BUSINESS_ROUTES.createSession}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#d9e6fb] to-[#9db8df] px-5 text-sm font-semibold text-[#0b1628] shadow-[0_10px_26px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08101d]"
          >
            Start session
          </Link>
        </div>
        </div>
      </section>
    </div>
  );
}
