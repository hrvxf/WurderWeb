"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import type { HandoffGuildWinCondition } from "@/domain/handoff/setup-draft";
import { buildAppJoinLink, buildJoinUniversalLink } from "@/domain/join/links";
import type { GameType } from "@/domain/handoff/gameTypeLink";
import type { CanonicalGameMode } from "@/lib/game/mode";
import { ensureFirebaseWebUser } from "@/lib/auth/ensure-firebase-web-user";
import { auth } from "@/lib/firebase";
import {
  applyModeSelection,
  buildStartSessionSetupPayload,
  parseStartSessionCreateResponse,
  shouldShowFreeForAllVariant,
  shouldShowGuildWinCondition,
  type FreeForAllVariant,
  type StartSessionCreateResponse,
} from "@/app/start-session/state";
import { addOptionalWebSentryBreadcrumb } from "@/lib/telemetry/web-breadcrumbs";

type SetupModeOption = {
  value: CanonicalGameMode | "free_for_all";
  label: string;
  shortLabel: string;
  summary: string;
  detail: string;
  bestFor: string[];
  accentClass: string;
};

type GuildWinCondition = HandoffGuildWinCondition;

const START_SESSION_GAME_TYPE: GameType = "b2c";

const MODE_SELECTIONS: SetupModeOption[] = [
  {
    value: "classic",
    label: "Classic",
    shortLabel: "Default social play",
    summary: "Balanced social assassin gameplay with the least setup friction.",
    detail: "Best when you want players into the game quickly with familiar rules and minimal explanation.",
    bestFor: ["House games", "Parties", "Fast starts"],
    accentClass: "from-amber-300/25 via-orange-300/8 to-transparent",
  },
  {
    value: "elimination",
    label: "Elimination",
    shortLabel: "Higher-pressure survival",
    summary: "A sharper survival format that raises pressure as players drop out.",
    detail: "Use this when you want clearer jeopardy, faster tension, and a more competitive rhythm.",
    bestFor: ["Competitive groups", "Shorter sessions", "High tension"],
    accentClass: "from-rose-400/28 via-red-300/8 to-transparent",
  },
  {
    value: "guilds",
    label: "Guilds",
    shortLabel: "Team-based play",
    summary: "Players compete as teams instead of as isolated individuals, best with groups of 6+.",
    detail: "Good when you want shared strategy, team identity, and easier spectating.",
    bestFor: ["Groups 6+", "Teams", "Shared strategy"],
    accentClass: "from-sky-300/24 via-cyan-300/8 to-transparent",
  },
  {
    value: "free_for_all",
    label: "Free-for-all",
    shortLabel: "Every player solo",
    summary: "Everyone plays for themselves with no alliances or team structure.",
    detail: "Works best when you want a direct, aggressive format with simple win logic and constant movement.",
    bestFor: ["Direct competition", "Aggressive play", "Solo winners"],
    accentClass: "from-fuchsia-300/24 via-violet-300/8 to-transparent",
  },
];

function displayGameTypeLabel(gameType: GameType): string {
  return gameType === "b2c" ? "Play with friends / Run an event" : "Business";
}

const FREE_FOR_ALL_VARIANTS: Array<{ value: FreeForAllVariant; label: string; description: string }> = [
  {
    value: "classic",
    label: "Classic",
    description: "Steady free-for-all pacing with standard progression.",
  },
  {
    value: "survivor",
    label: "Survivor",
    description: "A stricter last-player-standing emphasis.",
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
  const [session, setSession] = useState<StartSessionCreateResponse | null>(null);
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
      addOptionalWebSentryBreadcrumb({
        category: "game.create",
        message: "b2c_create_payload_sent",
        level: "info",
        data: {
          surface: "start-session",
          mode: requestPayload.mode,
          freeForAllVariant: requestPayload.freeForAllVariant ?? null,
          guildWinCondition: requestPayload.guildWinCondition ?? null,
        },
      });

      const response = await fetch("/api/b2c/games", {
        method: "POST",
        headers: {
          authorization: `Bearer ${idToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<StartSessionCreateResponse> & {
        message?: string;
      };
      console.info("b2c_create_response_raw", {
        status: response.status,
        ok: response.ok,
        jsonKeys: Object.keys(payload),
        gameCode: payload.gameCode ?? null,
        universalLink: payload.universalLink ?? null,
        deepLink: payload.deepLink ?? null,
        joinPath: payload.joinPath ?? null,
        metadata: payload.metadata ?? null,
      });

      if (!response.ok) {
        addOptionalWebSentryBreadcrumb({
          category: "game.create",
          message: "canonical_create_payload_rejected",
          level: "warning",
          data: {
            surface: "start-session",
            mode: requestPayload.mode,
            status: response.status,
            freeForAllVariant: requestPayload.freeForAllVariant ?? null,
            guildWinCondition: requestPayload.guildWinCondition ?? null,
          },
        });
        throw new Error(payload.message ?? "Unable to prepare setup handoff.");
      }

      const parsedSession = parseStartSessionCreateResponse({
        payload,
        fallbackConfig: {
          gameType: START_SESSION_GAME_TYPE,
          mode: requestPayload.mode,
          freeForAllVariant: requestPayload.freeForAllVariant as FreeForAllVariant | undefined,
          guildWinCondition: requestPayload.guildWinCondition as GuildWinCondition | undefined,
        },
      });
      setSession({
        ...parsedSession,
        deepLink: parsedSession.deepLink || buildAppJoinLink(parsedSession.gameCode),
        universalLink: parsedSession.universalLink || buildJoinUniversalLink(parsedSession.gameCode),
      });
      addOptionalWebSentryBreadcrumb({
        category: "game.create",
        message: "canonical_create_payload_validated",
        level: "info",
        data: {
          surface: "start-session",
          gameCode: parsedSession.gameCode,
          mode: parsedSession.config.mode,
          freeForAllVariant: parsedSession.config.freeForAllVariant ?? null,
          guildWinCondition: parsedSession.config.guildWinCondition ?? null,
        },
      });
    } catch (error) {
      addOptionalWebSentryBreadcrumb({
        category: "game.create",
        message: "canonical_create_payload_rejected",
        level: "error",
        data: {
          surface: "start-session",
          mode: selectedMode,
          freeForAllVariant: selectedFreeForAllVariant ?? null,
          guildWinCondition: selectedGuildWinCondition ?? null,
          error: error instanceof Error ? error.message : "Unable to create session.",
        },
      });
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
  const selectedModeOption = MODE_SELECTIONS.find((entry) => entry.value === selectedMode) ?? MODE_SELECTIONS[0];
  const selectedVariantOption =
    selectedMode === "free_for_all"
      ? FREE_FOR_ALL_VARIANTS.find((entry) => entry.value === (selectedFreeForAllVariant ?? "classic")) ??
        FREE_FOR_ALL_VARIANTS[0]
      : null;
  const selectedGuildConditionOption =
    selectedMode === "guilds"
      ? GUILD_WIN_CONDITIONS.find((entry) => entry.value === (selectedGuildWinCondition ?? "score")) ??
        GUILD_WIN_CONDITIONS[0]
      : null;

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Session Starter</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Choose your game</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            Pick the play style, adjust the rule twist if needed, and generate the session when the setup feels right.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.16fr)_minmax(340px,0.84fr)] lg:items-start xl:gap-10">
          <div className="space-y-6">
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Game Mode</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {MODE_SELECTIONS.map((option) => {
                  const isSelected = selectedMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleModeSelect(option.value)}
                      aria-pressed={isSelected}
                      className={`group relative overflow-hidden rounded-[1.35rem] text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e] ${
                        isSelected
                          ? "translate-y-[-1px] bg-white/[0.07] shadow-[0_16px_34px_rgba(0,0,0,0.22)]"
                          : "bg-white/[0.02] hover:translate-y-[-2px] hover:bg-white/[0.045] hover:shadow-[0_16px_30px_rgba(0,0,0,0.16)]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${option.accentClass} ${
                          isSelected ? "opacity-100" : "opacity-55"
                        }`}
                      />
                      <div className="relative flex h-full flex-col px-4 py-3.5">
                        <div className="flex items-start justify-end gap-3">
                          <span
                            className={`mt-1 h-3 w-3 rounded-full border ${
                              isSelected ? "border-amber-200/70 bg-amber-200 shadow-[0_0_18px_rgba(253,230,138,0.45)]" : "border-white/18 bg-transparent"
                            }`}
                          />
                        </div>

                        <div className="mt-3.5 transition-transform duration-200 ease-out group-hover:translate-y-[-1px]">
                          <p className="text-base font-semibold text-white">{option.label}</p>
                          <p className="mt-1 text-sm text-white/78">{option.shortLabel}</p>
                        </div>

                        <div className="mt-3.5 flex items-center justify-between gap-3">
                          <span className="text-[0.68rem] uppercase tracking-[0.16em] text-white/48">
                            {option.value === "guilds" ? "Best for 6+" : "Ready to play"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${
                              isSelected ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/58"
                            }`}
                          >
                            {isSelected ? "Active" : "Select"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="min-h-[11rem] rounded-[1.35rem] bg-white/[0.035] p-4 sm:p-5">
                {shouldShowFreeForAllVariant(selectedMode) ? (
                  <div key={`ffa-${selectedMode}-${selectedFreeForAllVariant ?? "classic"}`} className="animate-subtle-enter">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Variant</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">Free-for-all style</h3>
                    <p className="mt-1 text-sm leading-6 text-soft">Pick the finish you want players to feel.</p>
                    <div className="mt-4 inline-flex flex-wrap gap-2 rounded-2xl bg-black/18 p-1.5">
                      {FREE_FOR_ALL_VARIANTS.map((variant) => {
                        const isSelected = (selectedFreeForAllVariant ?? "classic") === variant.value;
                        return (
                          <button
                            key={variant.value}
                            type="button"
                            onClick={() => setSelectedFreeForAllVariant(variant.value)}
                            aria-pressed={isSelected}
                            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e] ${
                              isSelected
                                ? "border-transparent bg-white/[0.11] text-white shadow-[0_8px_22px_rgba(255,255,255,0.06)]"
                                : "border-transparent bg-transparent text-white/68 hover:translate-y-[-1px] hover:bg-white/[0.05]"
                            }`}
                          >
                            {variant.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">{selectedVariantOption?.description}</p>
                  </div>
                ) : null}

                {shouldShowGuildWinCondition(selectedMode) ? (
                  <div key={`guilds-${selectedMode}-${selectedGuildWinCondition ?? "score"}`} className="animate-subtle-enter">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Win Condition</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">How a guild wins</h3>
                    <p className="mt-1 text-sm leading-6 text-soft">Choose whether the session ends on score or survival.</p>
                    <div className="mt-4 inline-flex flex-wrap gap-2 rounded-2xl bg-black/18 p-1.5">
                      {GUILD_WIN_CONDITIONS.map((condition) => {
                        const isSelected = (selectedGuildWinCondition ?? "score") === condition.value;
                        return (
                          <button
                            key={condition.value}
                            type="button"
                            onClick={() => setSelectedGuildWinCondition(condition.value)}
                            aria-pressed={isSelected}
                            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e] ${
                              isSelected
                                ? "border-transparent bg-white/[0.11] text-white shadow-[0_8px_22px_rgba(255,255,255,0.06)]"
                                : "border-transparent bg-transparent text-white/68 hover:translate-y-[-1px] hover:bg-white/[0.05]"
                            }`}
                          >
                            {condition.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">{selectedGuildConditionOption?.description}</p>
                  </div>
                ) : null}

                {!shouldShowFreeForAllVariant(selectedMode) && !shouldShowGuildWinCondition(selectedMode) ? (
                  <div key={`details-${selectedMode}`} className="animate-subtle-enter">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Mode Details</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{selectedModeOption.label} is ready</h3>
                    <p className="mt-1 max-w-md text-sm leading-6 text-soft">
                      This mode does not need an extra rule choice, so you can move straight to session creation.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white/[0.04] p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Setup Summary</p>
              <div key={`summary-${selectedMode}-${selectedFreeForAllVariant ?? "na"}-${selectedGuildWinCondition ?? "na"}`} className="animate-subtle-enter">
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                {selectedMode === "guilds"
                  ? "Team-based play for groups of 6+"
                  : selectedMode === "free_for_all"
                    ? "Direct solo play with a single winner"
                    : selectedMode === "elimination"
                      ? "High-pressure play with sharper stakes"
                      : "Fast social play with minimal setup"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-soft">
                {selectedMode === "guilds"
                  ? "Guilds mode is set for team competition, with your chosen win condition deciding how victory is earned."
                  : selectedMode === "free_for_all"
                    ? "Free-for-all is ready for independent play with no teams or alliances."
                    : selectedMode === "elimination"
                      ? "Elimination is set for a more competitive rhythm with clearer jeopardy."
                  : "Classic mode is ready for a balanced social session that is easy to explain and start."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full bg-black/18 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/80">
                  {selectedModeOption.label}
                </span>
                {selectedVariantOption ? (
                  <span className="rounded-full bg-black/18 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/80">
                    {selectedVariantOption.label}
                  </span>
                ) : null}
                {selectedGuildConditionOption ? (
                  <span className="rounded-full bg-black/18 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/80">
                    {selectedGuildConditionOption.label}
                  </span>
                ) : null}
              </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => void handleContinue()}
                  disabled={isCreatingSession}
                  className="group relative w-full overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(217,106,90,0.18),rgba(199,53,93,0.14)_42%,rgba(17,17,20,0.92)_100%)] px-5 py-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition hover:shadow-[0_22px_48px_rgba(199,53,93,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_38%)] opacity-70 transition group-hover:opacity-100" />
                  <span className="relative flex items-center justify-between gap-4">
                    <span className="block">
                      <span className="block text-[0.68rem] uppercase tracking-[0.18em] text-amber-100/80">
                        Next Step
                      </span>
                      <span className="mt-1 block text-base font-semibold text-white">
                        {isCreatingSession ? "Creating session..." : "Create session"}
                      </span>
                      <span className="mt-1 block text-sm text-white/72">
                        {isCreatingSession ? "Preparing QR and join link..." : "Generate the game code, QR, and join link."}
                      </span>
                    </span>
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/20 text-lg text-white/90 transition group-hover:translate-x-0.5 group-hover:bg-black/28">
                      {isCreatingSession ? "..." : "->"}
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {createError ? (
              <p className="rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
                {createError}
              </p>
            ) : null}
          </div>

          <aside className="animate-subtle-enter relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.26)] lg:sticky lg:top-20">
            <span
              className={`pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-br ${session ? "from-emerald-300/22 via-sky-300/8 to-transparent" : selectedModeOption.accentClass} opacity-95`}
            />
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_32%)]" />
            <div className="relative">
            {!session ? (
              <div key={`live-${selectedMode}-${selectedFreeForAllVariant ?? "na"}-${selectedGuildWinCondition ?? "na"}`} className="animate-subtle-enter">
                <div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/64">Live Setup</p>
                    <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-white">{selectedModeOption.label}</h2>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-7 text-white/90">{selectedModeOption.summary}</p>
                <p className="mt-3 text-sm leading-7 text-white/72">{selectedModeOption.detail}</p>

                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/60">Best For</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedModeOption.bestFor.map((entry) => (
                      <span key={entry} className="rounded-full bg-black/20 px-3 py-1 text-xs text-white/84">
                        {entry}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedVariantOption ? (
                  <div className="mt-5 rounded-2xl bg-black/16 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">Variant</p>
                    <p className="mt-2 text-sm font-semibold text-white">{selectedVariantOption.label}</p>
                    <p className="mt-1 text-sm leading-6 text-white/74">{selectedVariantOption.description}</p>
                  </div>
                ) : null}

                {selectedGuildConditionOption ? (
                  <div className="mt-5 rounded-2xl bg-black/16 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">Win Condition</p>
                    <p className="mt-2 text-sm font-semibold text-white">{selectedGuildConditionOption.label}</p>
                    <p className="mt-1 text-sm leading-6 text-white/74">{selectedGuildConditionOption.description}</p>
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.08))] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/60">Current Setup</p>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4 pb-3">
                      <dt className="text-white/68">Experience</dt>
                      <dd className="text-right font-semibold text-white">{displayGameTypeLabel(START_SESSION_GAME_TYPE)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4 pb-3">
                      <dt className="text-white/68">Mode</dt>
                      <dd className="text-right font-semibold text-white">{selectedModeOption.label}</dd>
                    </div>
                    {selectedVariantOption ? (
                      <div className="flex items-start justify-between gap-4 pb-3">
                        <dt className="text-white/68">Variant</dt>
                        <dd className="text-right font-semibold text-white">{selectedVariantOption.label}</dd>
                      </div>
                    ) : null}
                    {selectedGuildConditionOption ? (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-white/68">Win condition</dt>
                        <dd className="text-right font-semibold text-white">{selectedGuildConditionOption.label}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            ) : (
              <div key={`session-${session.gameCode}`} className="animate-subtle-enter">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/64">Continue In Wurder</p>
                    <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-white">Session ready</h2>
                  </div>
                  <span className="rounded-full bg-emerald-300/12 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                    Ready
                  </span>
                </div>

                <p className="mt-3 text-sm leading-7 text-white/84">Scan the QR code or continue in the app on this device.</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-white/84">
                    {displayGameTypeLabel(session.config.gameType)}
                  </span>
                  <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-white/84">
                    {MODE_SELECTIONS.find((entry) => entry.value === session.config.mode)?.label ?? "Classic"}
                  </span>
                  {freeForAllVariant !== null ? (
                    <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-white/84">
                      {FREE_FOR_ALL_VARIANTS.find((entry) => entry.value === freeForAllVariant)?.label ?? "Classic"}
                    </span>
                  ) : null}
                  {guildWinCondition !== null ? (
                    <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-white/84">
                      {GUILD_WIN_CONDITIONS.find((entry) => entry.value === guildWinCondition)?.label ?? "Score race"}
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex justify-center rounded-[1.35rem] bg-white p-4 shadow-[0_16px_34px_rgba(255,255,255,0.08)]">
                  <QRCodeCanvas
                    value={session.universalLink}
                    size={220}
                    level="M"
                    fgColor="#111111"
                    bgColor="#FFFFFF"
                    marginSize={4}
                  />
                </div>

                <p className="mt-4 text-center text-sm text-white/84">Scan with your phone</p>
                {!isLikelyMobile ? (
                  <p className="mt-1 text-center text-xs text-white/58">Best used by scanning on a phone with Wurder installed.</p>
                ) : null}

                {isLikelyMobile ? (
                  <a
                    href={session.deepLink}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white/[0.09] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0e]"
                  >
                    Open in app
                  </a>
                ) : null}

                <details className="mt-4 rounded-xl bg-black/20 px-3 py-2 text-left text-xs text-white/62">
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
            )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
