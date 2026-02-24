"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function JoinFallbackClient({ gameCode }: { gameCode: string }) {
  const [showFallback, setShowFallback] = useState(false);

  const appDeepLink = useMemo(() => `wurder://join/${encodeURIComponent(gameCode)}`, [gameCode]);

  useEffect(() => {
    if (!gameCode) {
      setShowFallback(true);
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setShowFallback(true);
    }, 1400);

    window.location.href = appDeepLink;

    return () => window.clearTimeout(fallbackTimer);
  }, [appDeepLink, gameCode]);

  if (!showFallback) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-white">
        <p className="text-lg font-medium text-gray-700">Opening the Wurder app…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-white">
      <section className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Join game {gameCode}</h1>
        <p className="mt-3 text-gray-600">
          If Wurder is installed, tap below to open the game instantly. If not, install the app first.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={appDeepLink}
            className="inline-flex items-center justify-center rounded-xl bg-black text-white px-6 py-3 font-semibold hover:bg-gray-800 transition"
          >
            Open in app
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-amber-500 text-white px-6 py-3 font-semibold hover:bg-amber-600 transition"
          >
            Install app
          </Link>
        </div>
      </section>
    </main>
  );
}
