"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { HANDOFF_FALLBACK_DELAY_MS } from "@/domain/handoff/constants";
import { buildAppJoinLink, buildUniversalJoinLink } from "@/domain/join/links";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

type Props = {
  gameCode: string;
  isValidCode: boolean;
};

export default function JoinFallbackClient({ gameCode, isValidCode }: Props) {
  const [showFallback, setShowFallback] = useState(false);

  const universalLink = useMemo(() => buildUniversalJoinLink(gameCode), [gameCode]);
  const appDeepLink = useMemo(() => buildAppJoinLink(gameCode), [gameCode]);

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.joinPageView, {
      game_code_present: Boolean(gameCode),
      code_valid: isValidCode,
      source_channel: "direct",
    });

    if (!isValidCode) {
      trackEvent(ANALYTICS_EVENTS.joinFallbackShown, {
        handoff_outcome: "invalid_code",
      });
      setShowFallback(true);
      return;
    }

    trackEvent(ANALYTICS_EVENTS.joinCodeValid, { code_valid: true });

    const fallbackTimer = window.setTimeout(() => {
      setShowFallback(true);
      trackEvent(ANALYTICS_EVENTS.joinFallbackShown, {
        handoff_outcome: "fallback",
        source_channel: "join_route",
      });
    }, HANDOFF_FALLBACK_DELAY_MS);

    trackEvent(ANALYTICS_EVENTS.joinOpenAttempt, {
      handoff_outcome: "attempted",
      source_channel: "join_route",
    });

    window.location.assign(universalLink);

    const successTimer = window.setTimeout(() => {
      trackEvent(ANALYTICS_EVENTS.joinOpenSuccessProxy, {
        handoff_outcome: "opened",
        source_channel: "join_route",
      });
    }, 500);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(successTimer);
    };
  }, [gameCode, isValidCode, universalLink]);

  if (!showFallback) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center rounded-3xl glass-surface px-6 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">Join Handoff</p>
          <p className="mt-3 text-2xl font-semibold">Opening the Wurder app...</p>
          <p className="mt-2 text-soft">Game code {gameCode}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="glass-surface min-h-[60vh] rounded-3xl px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Join Game</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {isValidCode ? `Join ${gameCode}` : "Invalid game code"}
        </h1>
        <p className="mt-3 text-soft">
          {isValidCode
            ? "If the app is installed, open it directly. If not, install first and continue with the same game code."
            : "Game code must be six uppercase letters or numbers. Ask your host for a valid code."}
        </p>

        <div className="mt-8 grid gap-3">
          {isValidCode ? (
            <>
              <Button
                onClick={() => {
                  trackEvent(ANALYTICS_EVENTS.joinOpenAttempt, {
                    handoff_outcome: "manual_retry",
                    source_channel: "fallback",
                  });
                  window.location.assign(appDeepLink);
                }}
                fullWidth
              >
                Retry Open in App
              </Button>
              <Button
                href={`/?gameCode=${gameCode}`}
                variant="glass"
                fullWidth
                className="text-center"
              >
                Continue in Web
              </Button>
              <Button
                href={`/?install=1&gameCode=${gameCode}`}
                variant="ghost"
                fullWidth
                className="text-center"
                onClick={() =>
                  trackEvent(ANALYTICS_EVENTS.joinInstallClick, {
                    source_channel: "fallback",
                    game_code_present: true,
                  })
                }
              >
                Install App
              </Button>
            </>
          ) : (
            <Button href="/" variant="glass" fullWidth>
              Back to Home
            </Button>
          )}
        </div>

        <p className="mt-6 text-sm text-muted">
          Need help? <Link href="mailto:hello@wurder.app" className="underline">hello@wurder.app</Link>
        </p>
      </div>
    </main>
  );
}

