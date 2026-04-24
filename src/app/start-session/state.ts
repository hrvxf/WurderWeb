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

export type StartSessionConfig = {
  gameType: GameType;
  mode: StartSessionMode;
  freeForAllVariant?: FreeForAllVariant;
  guildWinCondition?: GuildWinCondition;
};

export type StartSessionMetadata = {
  createdFrom: string;
  createdAt: string;
  expiresAt: string;
  status: "waiting" | "started" | "expired";
};

export type StartSessionCreateResponse = {
  gameCode: string;
  gameType: GameType;
  config: StartSessionConfig;
  joinPath: string;
  deepLink: string;
  universalLink: string;
  metadata: StartSessionMetadata;
  setupId?: string;
  startPath?: string;
};

type StartSessionCreateApiPayload = Partial<StartSessionCreateResponse> & {
  gameType?: unknown;
  mode?: unknown;
  freeForAllVariant?: unknown;
  guildWinCondition?: unknown;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseStartSessionCreateResponse(input: {
  payload: StartSessionCreateApiPayload;
  fallbackConfig: StartSessionConfig;
}): StartSessionCreateResponse {
  const { payload, fallbackConfig } = input;
  const metadata = isRecord(payload.metadata) ? payload.metadata : null;
  const payloadConfig = isRecord(payload.config) ? payload.config : null;

  const gameCode = typeof payload.gameCode === "string" ? payload.gameCode : "";
  const joinPath = typeof payload.joinPath === "string" ? payload.joinPath : `/join/${gameCode}`;
  const deepLink = typeof payload.deepLink === "string" ? payload.deepLink : `wurder://join/${gameCode}`;
  const universalLink =
    typeof payload.universalLink === "string" ? payload.universalLink : `https://wurder.app${joinPath}`;

  const resolvedConfig: StartSessionConfig = {
    gameType:
      typeof payloadConfig?.gameType === "string"
        ? (payloadConfig.gameType as GameType)
        : typeof payload.gameType === "string"
          ? (payload.gameType as GameType)
          : fallbackConfig.gameType,
    mode:
      typeof payloadConfig?.mode === "string"
        ? (payloadConfig.mode as StartSessionMode)
        : typeof payload.mode === "string"
          ? (payload.mode as StartSessionMode)
          : fallbackConfig.mode,
    freeForAllVariant:
      typeof payloadConfig?.freeForAllVariant === "string"
        ? (payloadConfig.freeForAllVariant as FreeForAllVariant)
        : typeof payload.freeForAllVariant === "string"
          ? (payload.freeForAllVariant as FreeForAllVariant)
          : fallbackConfig.freeForAllVariant,
    guildWinCondition:
      typeof payloadConfig?.guildWinCondition === "string"
        ? (payloadConfig.guildWinCondition as GuildWinCondition)
        : typeof payload.guildWinCondition === "string"
          ? (payload.guildWinCondition as GuildWinCondition)
          : fallbackConfig.guildWinCondition,
  };

  if (
    !gameCode ||
    !joinPath ||
    !deepLink ||
    !universalLink ||
    !metadata ||
    typeof metadata.createdFrom !== "string" ||
    typeof metadata.createdAt !== "string" ||
    typeof metadata.expiresAt !== "string" ||
    typeof metadata.status !== "string" ||
    !resolvedConfig.gameType ||
    !resolvedConfig.mode
  ) {
    throw new Error("Session response was incomplete.");
  }

  return {
    gameCode,
    gameType: resolvedConfig.gameType,
    config: resolvedConfig,
    joinPath,
    deepLink,
    universalLink,
    metadata: {
      createdFrom: metadata.createdFrom,
      createdAt: metadata.createdAt,
      expiresAt: metadata.expiresAt,
      status: metadata.status as StartSessionMetadata["status"],
    },
    setupId: typeof payload.setupId === "string" ? payload.setupId : undefined,
    startPath: typeof payload.startPath === "string" ? payload.startPath : undefined,
  };
}

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
}): {
  gameType: GameType;
  mode: StartSessionMode;
  freeForAllVariant?: FreeForAllVariant;
  guildWinCondition?: GuildWinCondition;
} {
  const base: {
    gameType: GameType;
    mode: StartSessionMode;
    freeForAllVariant?: FreeForAllVariant;
    guildWinCondition?: GuildWinCondition;
  } = {
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
