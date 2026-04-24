import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildInitialGameDoc,
  generateGameCode,
  resolveDefaultClassicWordGroupId,
} from "@/domain/game/create-game";
import type { SessionGameType } from "@/lib/game/session-type";
import { parseCanonicalGameMode } from "@/lib/game/mode";
import type { HandoffFreeForAllVariant, HandoffGuildWinCondition } from "@/domain/handoff/setup-draft";

const MAX_GAME_CODE_ATTEMPTS = 6;

export type ManagerConfig = {
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
  freeForAllVariant?: HandoffFreeForAllVariant;
  guildWinCondition?: HandoffGuildWinCondition;
};

type CreateGameForHostUidInput = {
  hostUid: string;
  gameType?: SessionGameType;
  mode?: string;
  orgId?: string;
  templateId?: string;
  analyticsEnabled?: boolean;
  managerParticipation?: "host_only" | "host_player";
  managerConfig?: ManagerConfig;
  freeForAllVariant?: HandoffFreeForAllVariant;
  guildWinCondition?: HandoffGuildWinCondition;
  createdFrom?: "b2c_setup";
  expiresAtMs?: number;
  status?: "waiting" | "started" | "expired";
};

type AccountIdentityDoc = {
  usernameLower?: unknown;
  username?: unknown;
};

export class UnauthenticatedCreateGameError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthenticatedCreateGameError";
  }
}

export class GameCodeCollisionError extends Error {
  constructor(message = "Could not allocate a unique game code.") {
    super(message);
    this.name = "GameCodeCollisionError";
  }
}

export async function createGameForHostUid(input: string | CreateGameForHostUidInput): Promise<{ gameCode: string }> {
  const payload: CreateGameForHostUidInput = typeof input === "string" ? { hostUid: input } : input;
  const { hostUid } = payload;
  const gameType: SessionGameType = payload.gameType === "b2b" ? "b2b" : "b2c";

  if (!hostUid) {
    throw new UnauthenticatedCreateGameError("Missing authenticated host uid.");
  }

  const wordGroupId = await resolveDefaultClassicWordGroupId(adminDb).catch(() => null);
  const managerParticipation = payload.managerParticipation === "host_player" ? "host_player" : "host_only";
  const rawMode =
    typeof payload.mode === "string"
      ? payload.mode
      : typeof payload.managerConfig?.mode === "string"
        ? payload.managerConfig.mode
        : "";
  const normalizedRawMode = rawMode.trim().toLowerCase();
  const isFreeForAllMode = normalizedRawMode === "free_for_all";
  const managerMode = isFreeForAllMode
    ? "free_for_all"
    : parseCanonicalGameMode(rawMode) ?? "classic";
  const requestedFreeForAllVariant = payload.freeForAllVariant ?? payload.managerConfig?.freeForAllVariant;
  const requestedGuildWinCondition = payload.guildWinCondition ?? payload.managerConfig?.guildWinCondition;
  const resolvedFreeForAllVariant = isFreeForAllMode
    ? requestedFreeForAllVariant === "survivor"
      ? "survivor"
      : "classic"
    : null;
  const resolvedGuildWinCondition =
    managerMode === "guilds"
      ? requestedGuildWinCondition === "last_standing"
        ? "last_standing"
        : "score"
      : null;

  if (requestedFreeForAllVariant && !isFreeForAllMode) {
    throw new Error("freeForAllVariant is only allowed when mode is free_for_all.");
  }
  if (requestedGuildWinCondition && managerMode !== "guilds") {
    throw new Error("guildWinCondition is only allowed when mode is guilds.");
  }
  if (isFreeForAllMode && resolvedFreeForAllVariant !== requestedFreeForAllVariant) {
    console.info("create_game_default_applied", {
      field: "freeForAllVariant",
      reason: "missing_or_invalid",
      providedValue: requestedFreeForAllVariant ?? null,
      defaultValue: resolvedFreeForAllVariant,
    });
  }
  if (managerMode === "guilds" && resolvedGuildWinCondition !== requestedGuildWinCondition) {
    console.info("create_game_default_applied", {
      field: "guildWinCondition",
      reason: "missing_or_invalid",
      providedValue: requestedGuildWinCondition ?? null,
      defaultValue: resolvedGuildWinCondition,
    });
  }
  const hostPlayerId =
    managerParticipation === "host_player" ? await resolveCanonicalPlayerId(hostUid) : null;
  const normalizedManagerConfig =
    gameType === "b2b"
      ? {
          ...(payload.managerConfig ?? {}),
          managerParticipation,
          mode: managerMode,
          ...(resolvedFreeForAllVariant ? { freeForAllVariant: resolvedFreeForAllVariant } : {}),
          ...(resolvedGuildWinCondition ? { guildWinCondition: resolvedGuildWinCondition } : {}),
        }
      : payload.managerConfig;

  for (let attempt = 0; attempt < MAX_GAME_CODE_ATTEMPTS; attempt += 1) {
    const gameCode = generateGameCode();
    const gameRef = adminDb.collection("games").doc(gameCode);

    try {
      await adminDb.runTransaction(async (tx) => {
        const existing = await tx.get(gameRef);
        if (existing.exists) {
          throw new GameCodeCollisionError("Generated game code already exists.");
        }

        const baseDoc = buildInitialGameDoc({
          gameCode,
          gameType,
          hostPlayerId,
          createdByAccountId: hostUid,
          createdAt: FieldValue.serverTimestamp(),
          wordGroupId,
          lastActionAt: Date.now(),
          initialAliveCount: managerParticipation === "host_player" ? 1 : 0,
          classicMaxHuntersPerVictim: 3,
          classicPointsToWin: 25,
        });

        const resolvedMode = managerMode;

        const companyFields: Record<string, unknown> = {};
        companyFields.managerParticipation = managerParticipation;
        if (payload.orgId) companyFields.orgId = payload.orgId;
        if (payload.templateId) companyFields.templateId = payload.templateId;
        if (normalizedManagerConfig) companyFields.managerConfig = normalizedManagerConfig;
        if (payload.analyticsEnabled != null) companyFields.analyticsEnabled = payload.analyticsEnabled;
        if (gameType === "b2b") {
          console.info("b2b_create_payload_before_write", {
            gameCode,
            mode: managerMode,
            freeForAllVariant: resolvedFreeForAllVariant,
            guildWinCondition: resolvedGuildWinCondition,
            managerConfig: normalizedManagerConfig,
          });
          companyFields.freeForAllVariant = resolvedFreeForAllVariant;
          companyFields.guildWinCondition = resolvedGuildWinCondition;
        }
        if (payload.createdFrom === "b2c_setup") {
          companyFields.createdFrom = "b2c_setup" as const;
          companyFields.status = payload.status ?? "waiting";
          companyFields.expiresAt =
            typeof payload.expiresAtMs === "number" && Number.isFinite(payload.expiresAtMs)
              ? payload.expiresAtMs
              : Date.now() + 24 * 60 * 60 * 1000;
        }

        tx.set(gameRef, { ...baseDoc, mode: resolvedMode, ...companyFields });
        if (gameType === "b2b") {
          console.info("b2b_manager_config_written", {
            gameCode,
            managerConfig: normalizedManagerConfig,
          });
        }
      });

      return { gameCode };
    } catch (error) {
      if (error instanceof GameCodeCollisionError) {
        continue;
      }
      throw error;
    }
  }

  throw new GameCodeCollisionError();
}

async function resolveCanonicalPlayerId(uid: string): Promise<string> {
  try {
    const accountSnapshot = await adminDb.collection("accounts").doc(uid).get();
    const account = (accountSnapshot.data() ?? {}) as AccountIdentityDoc;

    if (typeof account.usernameLower === "string" && account.usernameLower.trim()) {
      return account.usernameLower.trim();
    }

    if (typeof account.username === "string" && account.username.trim()) {
      return account.username.trim();
    }
  } catch {
    // Fall back to uid if account lookup fails.
  }

  return uid;
}
