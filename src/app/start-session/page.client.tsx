"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";

import Button from "@/components/Button";
import type { HandoffGuildWinCondition, HandoffSetupConfig } from "@/domain/handoff/setup-draft";
import type { GameType } from "@/domain/handoff/gameTypeLink";
import type { CanonicalGameMode } from "@/lib/game/mode";
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

type SetupDraftApiResponse = {
  setupId: string;
  config: HandoffSetupConfig;
  expiresAtMs: number;
  deepLink: string;
  universalLink: string;
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
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [createError, setCreateError] = useState("");
  const [draft, setDraft] = useState<SetupDraftApiResponse | null>(null);
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
    setIsCreatingDraft(true);
    setCreateError("");

    try {
      const response = await fetch("/api/handoff/setups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...buildStartSessionSetupPayload({
            gameType: START_SESSION_GAME_TYPE,
            selectedMode,
            selectedFreeForAllVariant,
            selectedGuildWinCondition,
          }),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<SetupDraftApiResponse> & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to prepare setup handoff.");
      }

      if (
        typeof payload.setupId !== "string" ||
        typeof payload.deepLink !== "string" ||
        typeof payload.universalLink !== "string" ||
        typeof payload.expiresAtMs !== "number" ||
        !payload.config ||
        typeof payload.config.gameType !== "string" ||
        typeof payload.config.mode !== "string"
      ) {
        throw new Error("Handoff response was incomplete.");
      }

      setDraft(payload as SetupDraftApiResponse);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to prepare setup handoff.");
      setDraft(null);
    } finally {
      setIsCreatingDraft(false);
    }
  }

  const freeForAllVariant =
    draft !== null && draft.config.mode === "free_for_all" ? draft.config.freeForAllVariant : null;
  const guildWinCondition =
    draft !== null && draft.config.mode === "guilds" ? (draft.config.guildWinCondition ?? "score") : null;

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="surface-panel rounded-3xl p-6 sm:p-8">
        <Image src="/wurder_gold.png" alt="Wurder" width={200} height={60} className="h-auto w-[150px] sm:w-[190px]" priority />
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">Session Starter</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose your game</h1>
        <p className="mt-3 text-soft">Pick your setup, then continue in Wurder.</p>
        <p className="mt-2 text-xs text-muted">Your selected settings will open ready in the app.</p>

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
          <Button onClick={() => void handleContinue()} disabled={isCreatingDraft} className="min-w-36">
            {isCreatingDraft ? "Preparing..." : "Continue"}
          </Button>
        </div>
        {createError ? (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
            {createError}
          </p>
        ) : null}

        {draft ? (
          <div className="surface-panel-muted animate-subtle-enter mt-7 rounded-2xl p-5 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Continue In Wurder</p>
            <p className="mt-2 text-sm text-soft">
              Experience: <span className="font-semibold text-white">{displayGameTypeLabel(draft.config.gameType)}</span>
            </p>
            <p className="mt-1 text-sm text-soft">
              Mode: <span className="font-semibold text-white">{MODE_SELECTIONS.find((entry) => entry.value === draft.config.mode)?.label ?? "Classic"}</span>
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
                value={draft.universalLink}
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
                href={draft.deepLink}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-white/30 bg-white/[0.08] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
              >
                Open in app
              </a>
            ) : null}

            <details className="mt-4 rounded-lg border border-white/12 bg-black/20 px-3 py-2 text-left text-xs text-muted">
              <summary className="cursor-pointer select-none text-white/85">Technical details</summary>
              <p className="mt-2 break-all font-mono">setupId: {draft.setupId}</p>
              <p className="mt-1 break-all font-mono">gameType: {draft.config.gameType}</p>
              <p className="mt-1 break-all font-mono">mode: {draft.config.mode}</p>
              {draft.config.mode === "free_for_all" ? (
                <p className="mt-1 break-all font-mono">freeForAllVariant: {draft.config.freeForAllVariant ?? "classic"}</p>
              ) : null}
              {draft.config.mode === "guilds" ? (
                <p className="mt-1 break-all font-mono">guildWinCondition: {draft.config.guildWinCondition ?? "score"}</p>
              ) : null}
              <p className="mt-1 break-all font-mono">deepLink: {draft.deepLink}</p>
              <p className="mt-1 break-all font-mono">universalLink: {draft.universalLink}</p>
            </details>
          </div>
        ) : null}
      </div>
    </section>
  );
}
