import { parseCanonicalGameMode, type CanonicalGameMode } from "@/lib/game/mode";
import { normalizeSessionGameType, type SessionGameType } from "@/lib/game/session-type";

export const HANDOFF_SETUP_COLLECTION = "handoffSetups";
export const HANDOFF_SETUP_TTL_MS = 24 * 60 * 60 * 1000;
export const HANDOFF_SETUP_VERSION = 1 as const;
export const HANDOFF_SETUP_SOURCE = "web_game_setup_handoff" as const;

const SETUP_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SETUP_ID_LENGTH = 10;
const FREE_FOR_ALL_MODE = "free_for_all" as const;
export type HandoffFreeForAllVariant = "classic" | "survivor";
export type HandoffGuildWinCondition = "score" | "last_standing";
type CanonicalNonGuildMode = Exclude<CanonicalGameMode, "guilds">;

export type HandoffSetupConfig =
  | {
      gameType: SessionGameType;
      mode: CanonicalNonGuildMode;
    }
  | {
      gameType: SessionGameType;
      mode: "guilds";
      guildWinCondition?: HandoffGuildWinCondition;
    }
  | {
      gameType: SessionGameType;
      mode: typeof FREE_FOR_ALL_MODE;
      freeForAllVariant: HandoffFreeForAllVariant;
    };

export type HandoffSetupDraftDoc = {
  version: typeof HANDOFF_SETUP_VERSION;
  status: "draft";
  source: typeof HANDOFF_SETUP_SOURCE;
  config: HandoffSetupConfig;
  createdAtMs: number;
  updatedAtMs: number;
  expiresAtMs: number;
  createdByAccountId: string | null;
};

function randomSetupIdChar(): string {
  const randomIndex = Math.floor(Math.random() * SETUP_ID_CHARS.length);
  return SETUP_ID_CHARS[randomIndex] ?? "A";
}

export function generateSetupId(): string {
  let result = "";
  for (let index = 0; index < SETUP_ID_LENGTH; index += 1) {
    result += randomSetupIdChar();
  }
  return result;
}

export function isValidSetupId(value: string): boolean {
  return /^[A-Z2-9]{10}$/.test(value);
}

export function normalizeSetupId(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return isValidSetupId(normalized) ? normalized : null;
}

export function parseHandoffSetupConfig(raw: unknown): HandoffSetupConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as {
    gameType?: unknown;
    mode?: unknown;
    freeForAllVariant?: unknown;
    guildWinCondition?: unknown;
  };
  const gameType = normalizeSessionGameType(source.gameType);
  const normalizedMode = typeof source.mode === "string" ? source.mode.trim().toLowerCase() : "";
  const mode = normalizedMode === FREE_FOR_ALL_MODE ? FREE_FOR_ALL_MODE : parseCanonicalGameMode(source.mode);
  const normalizedVariant =
    typeof source.freeForAllVariant === "string" ? source.freeForAllVariant.trim().toLowerCase() : "";
  const normalizedGuildWinCondition =
    typeof source.guildWinCondition === "string" ? source.guildWinCondition.trim().toLowerCase() : "";

  if (mode === FREE_FOR_ALL_MODE) {
    if (normalizedGuildWinCondition.length > 0) return null;
    const freeForAllVariant =
      normalizedVariant === "survivor"
        ? "survivor"
        : normalizedVariant === "classic" || normalizedVariant.length === 0
          ? "classic"
          : null;
    if (!gameType || !freeForAllVariant) return null;
    return { gameType, mode, freeForAllVariant };
  }

  if (mode === "guilds") {
    if (normalizedVariant.length > 0) return null;
    const guildWinCondition =
      normalizedGuildWinCondition === "last_standing"
        ? "last_standing"
        : normalizedGuildWinCondition === "score"
          ? "score"
          : normalizedGuildWinCondition.length === 0
            ? undefined
            : null;
    if (!gameType || guildWinCondition === null) return null;
    return {
      gameType,
      mode,
      ...(guildWinCondition ? { guildWinCondition } : {}),
    };
  }

  if (normalizedGuildWinCondition.length > 0) {
    return null;
  }

  if (normalizedVariant.length > 0) {
    return null;
  }

  if (!gameType || !mode) return null;
  return { gameType, mode };
}

export function createHandoffSetupDraftDoc(input: {
  config: HandoffSetupConfig;
  createdByAccountId?: string | null;
  nowMs?: number;
}): HandoffSetupDraftDoc {
  const nowMs = input.nowMs ?? Date.now();
  return {
    version: HANDOFF_SETUP_VERSION,
    status: "draft",
    source: HANDOFF_SETUP_SOURCE,
    config: input.config,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    expiresAtMs: nowMs + HANDOFF_SETUP_TTL_MS,
    createdByAccountId: input.createdByAccountId?.trim() || null,
  };
}

export function parseHandoffSetupDraftDoc(raw: unknown): HandoffSetupDraftDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as {
    version?: unknown;
    status?: unknown;
    source?: unknown;
    config?: unknown;
    createdAtMs?: unknown;
    updatedAtMs?: unknown;
    expiresAtMs?: unknown;
    createdByAccountId?: unknown;
  };

  if (source.version !== HANDOFF_SETUP_VERSION) return null;
  if (source.status !== "draft") return null;
  if (source.source !== HANDOFF_SETUP_SOURCE) return null;

  const config = parseHandoffSetupConfig(source.config);
  if (!config) return null;

  if (
    typeof source.createdAtMs !== "number" ||
    typeof source.updatedAtMs !== "number" ||
    typeof source.expiresAtMs !== "number"
  ) {
    return null;
  }

  return {
    version: HANDOFF_SETUP_VERSION,
    status: "draft",
    source: HANDOFF_SETUP_SOURCE,
    config,
    createdAtMs: source.createdAtMs,
    updatedAtMs: source.updatedAtMs,
    expiresAtMs: source.expiresAtMs,
    createdByAccountId: typeof source.createdByAccountId === "string" ? source.createdByAccountId : null,
  };
}

export function isSetupExpired(expiresAtMs: number, nowMs = Date.now()): boolean {
  return nowMs >= expiresAtMs;
}

export function buildSetupDeepLink(setupId: string): string {
  return `wurder://?setupId=${setupId}&openPlay=1&skipResume=1`;
}

export function buildSetupUniversalLink(setupId: string): string {
  return `https://wurder.app/start/${setupId}`;
}
