import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildInitialGameDoc,
  generateGameCode,
  resolveDefaultClassicWordGroupId,
} from "@/domain/game/create-game";
import type { SessionGameType } from "@/lib/game/session-type";
import type { CanonicalGameMode } from "@/lib/game/mode";
import type { HandoffFreeForAllVariant, HandoffGuildWinCondition } from "@/domain/handoff/setup-draft";
import {
  assertCanonicalCreatePayload,
  assertGameDocCanonicalFields,
} from "@/lib/game/canonical-create";

const MAX_GAME_CODE_ATTEMPTS = 6;

export type ManagerConfig = {
  managerParticipation?: "host_only" | "host_player";
  mode: CanonicalGameMode | "free_for_all";
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
  gameType: SessionGameType;
  mode: CanonicalGameMode | "free_for_all";
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

type ManagerParticipation = "host_only" | "host_player";
type HostParticipationMode = "observer" | "participant";

type ResolveHostParticipationForCreateInput = {
  gameType: SessionGameType;
  createdFrom?: "b2c_setup";
  requestedManagerParticipation?: ManagerParticipation;
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

export function resolveHostParticipationForCreate(input: ResolveHostParticipationForCreateInput): {
  requestedManagerParticipation: ManagerParticipation | null;
  managerParticipation: ManagerParticipation;
  hostParticipationMode: HostParticipationMode;
  hostOnly: boolean;
  hostPlayerRowCreated: boolean;
} {
  const requestedManagerParticipation =
    input.requestedManagerParticipation === "host_player"
      ? "host_player"
      : input.requestedManagerParticipation === "host_only"
        ? "host_only"
        : null;

  if (input.gameType === "b2c" || input.createdFrom === "b2c_setup") {
    return {
      requestedManagerParticipation,
      managerParticipation: "host_player",
      hostParticipationMode: "participant",
      hostOnly: false,
      hostPlayerRowCreated: false,
    };
  }

  const managerParticipation =
    requestedManagerParticipation === "host_player" ? "host_player" : "host_only";

  return {
    requestedManagerParticipation,
    managerParticipation,
    hostParticipationMode: managerParticipation === "host_player" ? "participant" : "observer",
    hostOnly: managerParticipation === "host_only",
    hostPlayerRowCreated: managerParticipation === "host_player",
  };
}

function buildHostIdentityFields(input: {
  hostUid: string;
  hostParticipationMode?: HostParticipationMode;
  managerParticipation?: ManagerParticipation;
}) {
  const hostParticipationMode =
    input.hostParticipationMode ??
    (input.managerParticipation === "host_player" ? "participant" : "observer");

  return {
    createdBy: input.hostUid,
    managerAccountId: input.hostUid,
    managerUserId: input.hostUid,
    hostUserId: input.hostUid,
    hostParticipationMode,
    hostOnly: hostParticipationMode === "observer",
  };
}

export async function createGameForHostUid(input: string | CreateGameForHostUidInput): Promise<{ gameCode: string }> {
  if (typeof input === "string") {
    throw new Error("Canonical game payload is required.");
  }
  const payload: CreateGameForHostUidInput = input;
  assertCanonicalCreatePayload(payload, {
    surface: payload.gameType ?? "unknown",
    stage: "createGameForHostUid:entry",
  });
  const { hostUid } = payload;
  const gameType: SessionGameType = payload.gameType;

  if (!hostUid) {
    throw new UnauthenticatedCreateGameError("Missing authenticated host uid.");
  }

  const wordGroupId = await resolveDefaultClassicWordGroupId(adminDb).catch(() => null);
  const resolvedHostParticipation = resolveHostParticipationForCreate({
    gameType,
    createdFrom: payload.createdFrom,
    requestedManagerParticipation: payload.managerParticipation,
  });
  const managerParticipation = resolvedHostParticipation.managerParticipation;
  const hostParticipationMode = resolvedHostParticipation.hostParticipationMode;
  const managerMode = payload.mode;
  const isFreeForAllMode = managerMode === "free_for_all";
  const requestedFreeForAllVariant = payload.freeForAllVariant ?? payload.managerConfig?.freeForAllVariant;
  const requestedGuildWinCondition = payload.guildWinCondition ?? payload.managerConfig?.guildWinCondition;
  const resolvedFreeForAllVariant = isFreeForAllMode ? requestedFreeForAllVariant : undefined;
  const resolvedGuildWinCondition = managerMode === "guilds" ? requestedGuildWinCondition : undefined;

  console.info("create_game_host_participation_resolved", {
    gameType,
    createdFrom: payload.createdFrom ?? null,
    requestedManagerParticipation: resolvedHostParticipation.requestedManagerParticipation,
    resolvedManagerParticipation: managerParticipation,
    resolvedHostParticipationMode: hostParticipationMode,
    resolvedHostOnly: resolvedHostParticipation.hostOnly,
    hostPlayerRowCreated: resolvedHostParticipation.hostPlayerRowCreated,
  });

  if (gameType === "b2b" && payload.managerConfig) {
    if (payload.managerConfig.mode !== managerMode) {
      throw new Error("managerConfig.mode must match mode.");
    }
    const requiredNumberFields: Array<keyof ManagerConfig> = [
      "durationMinutes",
      "minSecondsBeforeClaim",
      "minSecondsBetweenClaims",
      "maxActiveClaimsPerPlayer",
      "freeRefreshCooldownSeconds",
    ];
    for (const field of requiredNumberFields) {
      const value = payload.managerConfig[field];
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(`managerConfig.${field} is required.`);
      }
    }
    if (!Array.isArray(payload.managerConfig.metricsEnabled)) {
      throw new Error("managerConfig.metricsEnabled is required.");
    }
  }
  const hostPlayerId = resolvedHostParticipation.hostPlayerRowCreated
    ? await resolveCanonicalPlayerId(hostUid)
    : null;
  const normalizedManagerConfig =
    gameType === "b2b"
      ? {
          ...(payload.managerConfig ?? {}),
          managerParticipation,
          mode: managerMode,
          ...(resolvedFreeForAllVariant != null ? { freeForAllVariant: resolvedFreeForAllVariant } : {}),
          ...(resolvedGuildWinCondition != null ? { guildWinCondition: resolvedGuildWinCondition } : {}),
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
          initialAliveCount: resolvedHostParticipation.hostPlayerRowCreated ? 1 : 0,
          classicMaxHuntersPerVictim: 3,
          classicPointsToWin: 25,
        });
        const hostIdentityFields = buildHostIdentityFields({
          hostUid,
          hostParticipationMode,
          managerParticipation,
        });

        const resolvedMode = managerMode;

        const companyFields: Record<string, unknown> = {};
        companyFields.hostParticipationMode = hostParticipationMode;
        companyFields.managerParticipation = managerParticipation;
        companyFields.hostOnly = resolvedHostParticipation.hostOnly;
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
        }
        if (resolvedFreeForAllVariant != null) {
          companyFields.freeForAllVariant = resolvedFreeForAllVariant;
        }
        if (resolvedGuildWinCondition != null) {
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

        const gameDoc = {
          ...baseDoc,
          ...hostIdentityFields,
          mode: resolvedMode,
          ...companyFields,
        };
        console.info("game_host_identity_fields_written", {
          gameCode,
          gameType,
          currentHostUid: hostUid,
          createdByAccountId: hostUid,
          gameManagerAccountId: hostIdentityFields.managerAccountId,
          gameManagerUserId: hostIdentityFields.managerUserId,
          gameHostUserId: hostIdentityFields.hostUserId,
          gameHostParticipationMode: hostIdentityFields.hostParticipationMode,
          gameHostOnly: hostIdentityFields.hostOnly,
          requestedManagerParticipation: resolvedHostParticipation.requestedManagerParticipation,
          resolvedManagerParticipation: managerParticipation,
          hostPlayerId,
        });
        assertGameDocCanonicalFields({
          payload: {
            gameType,
            mode: resolvedMode,
            freeForAllVariant: resolvedFreeForAllVariant,
            guildWinCondition: resolvedGuildWinCondition,
            managerConfig: normalizedManagerConfig,
          },
          gameDoc,
          context: {
            surface: gameType,
            stage: "createGameForHostUid:preWrite",
          },
        });
        tx.set(gameRef, gameDoc);
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
