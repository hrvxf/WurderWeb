import { parseCanonicalGameMode, type CanonicalGameMode } from "@/lib/game/mode";
import { normalizeSessionGameType } from "@/lib/game/session-type";

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
export type HandoffSessionType = "host_only" | "player";
export type HandoffB2BManagerConfig = {
  managerParticipation?: "host_only" | "host_player";
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
  metricsEnabled: string[];
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  maxActiveClaimsPerPlayer: number;
  freeRefreshCooldownSeconds: number;
};

type HandoffSetupB2CConfig =
  | {
      gameType: "b2c";
      mode: CanonicalNonGuildMode;
    }
  | {
      gameType: "b2c";
      mode: "guilds";
      guildWinCondition?: HandoffGuildWinCondition;
    }
  | {
      gameType: "b2c";
      mode: typeof FREE_FOR_ALL_MODE;
      freeForAllVariant: HandoffFreeForAllVariant;
    };

export type HandoffSetupB2BConfig = {
  gameType: "b2b";
  mode: CanonicalGameMode | typeof FREE_FOR_ALL_MODE;
  freeForAllVariant?: HandoffFreeForAllVariant;
  guildWinCondition?: HandoffGuildWinCondition;
  orgId: string;
  templateId?: string;
  sessionType: HandoffSessionType;
  managerConfig?: HandoffB2BManagerConfig;
  analyticsEnabled?: boolean;
};

export type HandoffSetupConfig = HandoffSetupB2CConfig | HandoffSetupB2BConfig;

export type HandoffSetupDraftDoc = {
  version: typeof HANDOFF_SETUP_VERSION;
  status: "draft";
  source: typeof HANDOFF_SETUP_SOURCE;
  config: HandoffSetupConfig;
  createdAtMs: number;
  updatedAtMs: number;
  expiresAtMs: number;
  createdByAccountId: string | null;
  consumedAtMs: number | null;
  consumedByAccountId: string | null;
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
    orgId?: unknown;
    templateId?: unknown;
    sessionType?: unknown;
    managerConfig?: unknown;
    analyticsEnabled?: unknown;
  };
  const gameType = normalizeSessionGameType(source.gameType);
  const normalizedMode = typeof source.mode === "string" ? source.mode.trim().toLowerCase() : "";
  const mode = normalizedMode === FREE_FOR_ALL_MODE ? FREE_FOR_ALL_MODE : parseCanonicalGameMode(source.mode);
  const normalizedVariant =
    typeof source.freeForAllVariant === "string" ? source.freeForAllVariant.trim().toLowerCase() : "";
  const normalizedGuildWinCondition =
    typeof source.guildWinCondition === "string" ? source.guildWinCondition.trim().toLowerCase() : "";

  if (gameType === "b2b") {
    const orgId = typeof source.orgId === "string" ? source.orgId.trim() : "";
    if (!orgId) return null;
    const templateId = typeof source.templateId === "string" ? source.templateId.trim() : "";
    const sessionTypeRaw = typeof source.sessionType === "string" ? source.sessionType.trim().toLowerCase() : "";
    const sessionType: HandoffSessionType | null =
      sessionTypeRaw === "host_only" ? "host_only" : sessionTypeRaw === "player" ? "player" : null;
    const analyticsEnabled =
      typeof source.analyticsEnabled === "boolean" ? source.analyticsEnabled : undefined;
    if (!mode || !sessionType) return null;

    if (mode !== FREE_FOR_ALL_MODE && normalizedVariant.length > 0) return null;
    if (mode !== "guilds" && normalizedGuildWinCondition.length > 0) return null;

    const freeForAllVariant =
      mode === FREE_FOR_ALL_MODE
        ? normalizedVariant === "survivor"
          ? "survivor"
          : normalizedVariant === "classic" || normalizedVariant.length === 0
            ? "classic"
            : null
        : undefined;
    if (mode === FREE_FOR_ALL_MODE && !freeForAllVariant) return null;

    const guildWinCondition =
      mode === "guilds"
        ? normalizedGuildWinCondition === "last_standing"
          ? "last_standing"
          : normalizedGuildWinCondition === "score"
            ? "score"
            : normalizedGuildWinCondition.length === 0
              ? undefined
              : null
        : undefined;
    if (mode === "guilds" && guildWinCondition === null) return null;

    return {
      gameType: "b2b",
      mode,
      ...(freeForAllVariant ? { freeForAllVariant } : {}),
      ...(guildWinCondition ? { guildWinCondition } : {}),
      orgId,
      ...(templateId ? { templateId } : {}),
      sessionType,
      ...(source.managerConfig && typeof source.managerConfig === "object"
        ? { managerConfig: source.managerConfig as HandoffB2BManagerConfig }
        : {}),
      ...(analyticsEnabled == null ? {} : { analyticsEnabled }),
    };
  }

  if (mode === FREE_FOR_ALL_MODE) {
    if (normalizedGuildWinCondition.length > 0) return null;
    const freeForAllVariant =
      normalizedVariant === "survivor"
        ? "survivor"
        : normalizedVariant === "classic" || normalizedVariant.length === 0
          ? "classic"
          : null;
    if (gameType !== "b2c" || !freeForAllVariant) return null;
    return { gameType: "b2c", mode, freeForAllVariant };
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
    if (gameType !== "b2c" || guildWinCondition === null) return null;
    return {
      gameType: "b2c",
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

  if (gameType !== "b2c" || !mode) return null;
  return { gameType: "b2c", mode };
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
    consumedAtMs: null,
    consumedByAccountId: null,
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
    consumedAtMs?: unknown;
    consumedByAccountId?: unknown;
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
    consumedAtMs: typeof source.consumedAtMs === "number" ? source.consumedAtMs : null,
    consumedByAccountId: typeof source.consumedByAccountId === "string" ? source.consumedByAccountId : null,
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
