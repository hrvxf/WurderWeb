"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";

import Button from "@/components/Button";
import type { HandoffGuildWinCondition, HandoffSetupConfig } from "@/domain/handoff/setup-draft";
import { buildAppJoinLink, buildJoinUniversalLink } from "@/domain/join/links";
import type { GameType } from "@/domain/handoff/gameTypeLink";
import type { CanonicalGameMode } from "@/lib/game/mode";
import { ensureFirebaseWebUser } from "@/lib/auth/ensure-firebase-web-user";
import { auth } from "@/lib/firebase";
import {
  applyModeSelection,
  buildStartSessionSetupPayload,
  shouldShowFreeForAllVariant,
  shouldShowGuildWinCondition,
  type FreeForAllVariant,
} from "@/app/start-session/state";

type SetupModeOption = {
  value: CanonicalGameMode | "free_for_all";
  label: string;
  description: string;
};

type GuildWinCondition = HandoffGuildWinCondition;

type B2CSessionApiResponse = {
  gameCode: string;
  gameType: "b2c";
  config: HandoffSetupConfig;
  joinPath: string;
  deepLink: string;
  universalLink: string;
  metadata: {
    createdFrom: string;
    createdAt: string;
    expiresAt: string;
    status: "waiting" | "started" | "expired";
  };
  setupId?: string;
  startPath?: string;
};

const START_SESSION_GAME_TYPE: GameType = "b2c";

const MODE_SELECTIONS: SetupModeOption[] = [
  {
    value: "classic",
    label: "Classic",
    description: "Default social assassin gameplay.",
  },
  {
    value: "elimination",
    label: "Elimination",
    description: "Higher-pressure survival format.",
  },
  {
    value: "guilds",
    label: "Guilds",
    description: "Team-oriented gameplay flow.",
  },
  {
    value: "free_for_all",
    label: "Free-for-all",
    description: "Every player for themselves.",
  },
];

function displayGameTypeLabel(gameType: GameType): string {
  return gameType === "b2c" ? "Play with friends / Run an event" : "Business";
}

const FREE_FOR_ALL_VARIANTS: Array<{ value: FreeForAllVariant; label: string; description: string }> = [
  {
    value: "classic",
    label: "Classic",
    description: "Standard free-for-all progression.",
  },
  {
    value: "survivor",
    label: "Survivor",
    description: "Last-player-standing style emphasis.",
  },
];

const GUILD_WIN_CONDITIONS: Array<{ value: GuildWinCondition; label: string; description: string }> = [
  {
    value: "score",
    label: "Score race",
    description: "First guild to the target score wins.",
  },
  {
    value: "last_standing",
    label: "Last guild standing",
    description: "Guild survives by outlasting the others.",
  },
];

export default function StartSessionPageClient() {
  const [selectedMode, setSelectedMode] = useState<CanonicalGameMode | "free_for_all">("classic");
  const [selectedFreeForAllVariant, setSelectedFreeForAllVariant] = useState<FreeForAllVariant | null>(null);
  const [selectedGuildWinCondition, setSelectedGuildWinCondition] = useState<GuildWinCondition | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [createError, setCreateError] = useState("");
  const [session, setSession] = useState<B2CSessionApiResponse | null>(null);
  const [isLikelyMobile, setIsLikelyMobile] = useState(false);

  useEffect(() => {
    const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "").toLowerCase();
    const coarsePointer = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    const mobileUa = /android|iphone|ipad|ipod|mobile/.test(ua);
    setIsLikelyMobile(coarsePointer || mobileUa);
  }, []);

  function handleModeSelect(nextMode: CanonicalGameMode | "free_for_all") {
    const nextState = applyModeSelection(
      {
        selectedMode,
        selectedFreeForAllVariant,
        selectedGuildWinCondition,
      },
      nextMode
    );
    setSelectedMode(nextState.selectedMode);
    setSelectedFreeForAllVariant(nextState.selectedFreeForAllVariant);
    setSelectedGuildWinCondition(nextState.selectedGuildWinCondition);
  }

  async function handleContinue() {
    setIsCreatingSession(true);
    setCreateError("");

    try {
      const existingUser = auth.currentUser;
      if (!existingUser) {
        console.info("b2c_create_auth_missing", { surface: "start-session" });
      }

      const user = await ensureFirebaseWebUser();
      const idToken = await user.getIdToken();
      console.info("b2c_create_auth_ready", {
        surface: "start-session",
        uid: user.uid,
        isAnonymous: user.isAnonymous,
      });

      const requestPayload = buildStartSessionSetupPayload({
        gameType: START_SESSION_GAME_TYPE,
        selectedMode,
        selectedFreeForAllVariant,
        selectedGuildWinCondition,
      });
      console.info("b2c_create_payload_sent", {
        surface: "start-session",
        mode: requestPayload.mode,
        freeForAllVariant: requestPayload.freeForAllVariant ?? null,
        guildWinCondition: requestPayload.guildWinCondition ?? null,
      });

      const response = await fetch("/api/b2c/games", {
        method: "POST",
        headers: {
          authorization: `Bearer ${idToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<B2CSessionApiResponse> & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to prepare setup handoff.");
      }

      if (
        typeof payload.gameCode !== "string" ||
        typeof payload.deepLink !== "string" ||
        typeof payload.universalLink !== "string" ||
        !payload.config ||
        typeof payload.config.gameType !== "string" ||
        typeof payload.config.mode !== "string"
      ) {
        throw new Error("Session response was incomplete.");
      }

      setSession({
        ...(payload as B2CSessionApiResponse),
        deepLink: payload.deepLink || buildAppJoinLink(payload.gameCode),
        universalLink: payload.universalLink || buildJoinUniversalLink(payload.gameCode),
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create session.");
      setSession(null);
    } finally {
      setIsCreatingSession(false);
    }
  }

  const freeForAllVariant =
    session !== null && session.config.mode === "free_for_all" ? session.config.freeForAllVariant : null;
  const guildWinCondition =
    session !== null && session.config.mode === "guilds" ? (session.config.guildWinCondition ?? "score") : null;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="surface-panel rounded-3xl p-6 sm:p-8">
        <Image src="/wurder_gold.png" alt="Wurder" width={200} height={60} className="h-auto w-[150px] sm:w-[190px]" priority />
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">Session Starter</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose your game</h1>
        <p className="mt-3 text-soft">Pick your setup, then create a game instantly.</p>
        <p className="mt-2 text-xs text-muted">Your QR now opens directly with /join/{`{gameCode}`}. </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {MODE_SELECTIONS.map((option) => {
            const isSelected = selectedMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleModeSelect(option.value)}
                aria-pressed={isSelected}
                className={`surface-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e] ${
                  isSelected ? "border-amber-200/70 bg-amber-100/10" : "hover:border-white/30 hover:bg-white/[0.08]"
                }`}
              >
                <div className="p-4">
                  <p className="text-base font-semibold">{option.label}</p>
                  <p className="mt-1 text-sm text-soft">{option.description}</p>
                  <p className="mt-2 text-xs font-mono text-muted">{option.value}</p>
                </div>
              </button>
            );
          })}
        </div>

        {shouldShowFreeForAllVariant(selectedMode) ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Free-for-all Variant</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {FREE_FOR_ALL_VARIANTS.map((variant) => {
                const isSelected = (selectedFreeForAllVariant ?? "classic") === variant.value;
                return (
                  <button
                    key={variant.value}
                    type="button"
                    onClick={() => setSelectedFreeForAllVariant(variant.value)}
                    aria-pressed={isSelected}
                    className={`surface-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e] ${
                      isSelected ? "border-amber-200/70 bg-amber-100/10" : "hover:border-white/30 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="p-4">
                      <p className="text-base font-semibold">{variant.label}</p>
                      <p className="mt-1 text-sm text-soft">{variant.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {shouldShowGuildWinCondition(selectedMode) ? (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Guild Win Condition</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {GUILD_WIN_CONDITIONS.map((condition) => {
                const isSelected = (selectedGuildWinCondition ?? "score") === condition.value;
                return (
                  <button
                    key={condition.value}
                    type="button"
                    onClick={() => setSelectedGuildWinCondition(condition.value)}
                    aria-pressed={isSelected}
                    className={`surface-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e] ${
                      isSelected ? "border-amber-200/70 bg-amber-100/10" : "hover:border-white/30 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="p-4">
                      <p className="text-base font-semibold">{condition.label}</p>
                      <p className="mt-1 text-sm text-soft">{condition.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Button onClick={() => void handleContinue()} disabled={isCreatingSession} className="min-w-36">
            {isCreatingSession ? "Creating session..." : "Create session"}
          </Button>
        </div>
        {createError ? (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
            {createError}
          </p>
        ) : null}

        {session ? (
          <div className="surface-panel-muted animate-subtle-enter mt-7 rounded-2xl p-5 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Continue In Wurder</p>
            <p className="mt-2 text-sm text-soft">
              Experience: <span className="font-semibold text-white">{displayGameTypeLabel(session.config.gameType)}</span>
            </p>
            <p className="mt-1 text-sm text-soft">
              Mode: <span className="font-semibold text-white">{MODE_SELECTIONS.find((entry) => entry.value === session.config.mode)?.label ?? "Classic"}</span>
            </p>
            {freeForAllVariant !== null ? (
              <p className="mt-1 text-sm text-soft">
                Variant:{" "}
                <span className="font-semibold text-white">
                  {FREE_FOR_ALL_VARIANTS.find((entry) => entry.value === freeForAllVariant)?.label ?? "Classic"}
                </span>
              </p>
            ) : null}
            {guildWinCondition !== null ? (
              <p className="mt-1 text-sm text-soft">
                Win condition:{" "}
                <span className="font-semibold text-white">
                  {GUILD_WIN_CONDITIONS.find((entry) => entry.value === guildWinCondition)?.label ?? "Score race"}
                </span>
              </p>
            ) : null}

            <div className="mt-4 inline-flex rounded-xl border border-white/25 bg-white p-3">
              <QRCodeCanvas
                value={session.universalLink}
                size={220}
                level="M"
                fgColor="#111111"
                bgColor="#FFFFFF"
                marginSize={4}
              />
            </div>

            <p className="mt-4 text-sm text-soft">Scan with your phone</p>
            {!isLikelyMobile ? (
              <p className="mt-1 text-xs text-muted">Best used by scanning on a phone with Wurder installed.</p>
            ) : null}

            {isLikelyMobile ? (
              <a
                href={session.deepLink}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-white/30 bg-white/[0.08] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
              >
                Open in app
              </a>
            ) : null}

            <details className="mt-4 rounded-lg border border-white/12 bg-black/20 px-3 py-2 text-left text-xs text-muted">
              <summary className="cursor-pointer select-none text-white/85">Technical details</summary>
              <p className="mt-2 break-all font-mono">gameCode: {session.gameCode}</p>
              <p className="mt-1 break-all font-mono">joinPath: {session.joinPath}</p>
              {session.setupId ? <p className="mt-1 break-all font-mono">setupId: {session.setupId}</p> : null}
              <p className="mt-1 break-all font-mono">gameType: {session.config.gameType}</p>
              <p className="mt-1 break-all font-mono">mode: {session.config.mode}</p>
              {session.config.mode === "free_for_all" ? (
                <p className="mt-1 break-all font-mono">freeForAllVariant: {session.config.freeForAllVariant ?? "classic"}</p>
              ) : null}
              {session.config.mode === "guilds" ? (
                <p className="mt-1 break-all font-mono">guildWinCondition: {session.config.guildWinCondition ?? "score"}</p>
              ) : null}
              <p className="mt-1 break-all font-mono">status: {session.metadata.status}</p>
              <p className="mt-1 break-all font-mono">createdFrom: {session.metadata.createdFrom}</p>
              <p className="mt-1 break-all font-mono">createdAt: {session.metadata.createdAt}</p>
              <p className="mt-1 break-all font-mono">expiresAt: {session.metadata.expiresAt}</p>
              <p className="mt-1 break-all font-mono">deepLink: {session.deepLink}</p>
              <p className="mt-1 break-all font-mono">universalLink: {session.universalLink}</p>
            </details>
          </div>
        ) : null}
      </div>
    </section>
  );
}
