"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { parseGameCode } from "@/domain/join/code";

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const normalized = useMemo(() => parseGameCode(input), [input]);

  function submitJoin() {
    if (!normalized.isValid) return;
    router.push(`/join/${normalized.value}`);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Wurder",
    url: "https://wurder.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://wurder.app/join/{gameCode}",
      "query-input": "required name=gameCode",
    },
  };

  return (
    <div className="space-y-10 py-3">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="glass-surface rounded-3xl px-6 py-10 sm:px-10">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">Wurder</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Fast social assassin gameplay with reliable join handoff.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-soft sm:text-lg">
          Scan invite QR or use a game code. Web validates and opens app directly, with safe fallback if not installed.
        </p>
        <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-[1fr_auto]">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="input-dark"
            placeholder="Enter 6-character game code"
            maxLength={12}
            aria-label="Game code"
          />
          <Button onClick={submitJoin} disabled={!normalized.isValid} fullWidth>
            Join Game
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">Valid format: 6 uppercase letters or numbers.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/buy" variant="glass">
            Host a Game
          </Button>
          <Button href="/contact" variant="ghost">
            Support
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="glass-surface rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Game code first</h2>
          <p className="mt-2 text-sm text-soft">Use the same 6-character game code contract everywhere.</p>
        </article>
        <article className="glass-surface rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Fair claim flow</h2>
          <p className="mt-2 text-sm text-soft">Kill claim and dispute language matches app behavior.</p>
        </article>
        <article className="glass-surface rounded-2xl p-5">
          <h2 className="text-lg font-semibold">No dead ends</h2>
          <p className="mt-2 text-sm text-soft">Every join path has install, retry, and manual fallback actions.</p>
        </article>
      </section>
    </div>
  );
}


