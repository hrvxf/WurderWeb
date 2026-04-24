import type { HandoffGuildWinCondition } from "@/domain/handoff/setup-draft";
import type { GameType } from "@/domain/handoff/gameTypeLink";
import type { CanonicalGameMode } from "@/lib/game/mode";

export type StartSessionMode = CanonicalGameMode | "free_for_all";
export type FreeForAllVariant = "classic" | "survivor";
export type GuildWinCondition = HandoffGuildWinCondition;

export type StartSessionModeState = {
  selectedMode: StartSessionMode;
  selectedFreeForAllVariant: FreeForAllVariant | null;
  selectedGuildWinCondition: GuildWinCondition | null;
};

export function shouldShowFreeForAllVariant(mode: StartSessionMode): boolean {
  return mode === "free_for_all";
}

export function shouldShowGuildWinCondition(mode: StartSessionMode): boolean {
  return mode === "guilds";
}

export function applyModeSelection(
  state: StartSessionModeState,
  nextMode: StartSessionMode
): StartSessionModeState {
  if (nextMode === "free_for_all") {
    return {
      selectedMode: nextMode,
      selectedFreeForAllVariant: state.selectedFreeForAllVariant ?? "classic",
      selectedGuildWinCondition: null,
    };
  }

  if (nextMode === "guilds") {
    return {
      selectedMode: nextMode,
      selectedFreeForAllVariant: null,
      selectedGuildWinCondition: state.selectedGuildWinCondition ?? "score",
    };
  }

  return {
    selectedMode: nextMode,
    selectedFreeForAllVariant: null,
    selectedGuildWinCondition: null,
  };
}

export function buildStartSessionSetupPayload(input: {
  gameType: GameType;
  selectedMode: StartSessionMode;
  selectedFreeForAllVariant: FreeForAllVariant | null;
  selectedGuildWinCondition: GuildWinCondition | null;
}): Record<string, string> {
  const base: Record<string, string> = {
    gameType: input.gameType,
    mode: input.selectedMode,
  };

  if (input.selectedMode === "free_for_all") {
    if (!input.selectedFreeForAllVariant) {
      throw new Error("Select a free-for-all variant before continuing.");
    }
    base.freeForAllVariant = input.selectedFreeForAllVariant;
    return base;
  }

  if (input.selectedMode === "guilds") {
    if (!input.selectedGuildWinCondition) {
      throw new Error("Select a guild win condition before continuing.");
    }
    base.guildWinCondition = input.selectedGuildWinCondition;
    return base;
  }

  return base;
}
