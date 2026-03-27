import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  buildInitialGameDoc,
  generateGameCode,
  resolveDefaultClassicWordGroupId,
} from "@/domain/game/create-game";
import type { SessionGameType } from "@/lib/game/session-type";

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
};

type CreateGameForHostUidInput = {
  hostUid: string;
  gameType?: SessionGameType;
  orgId?: string;
  templateId?: string;
  analyticsEnabled?: boolean;
  managerParticipation?: "host_only" | "host_player";
  managerConfig?: ManagerConfig;
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
  const hostPlayerId =
    managerParticipation === "host_player" ? await resolveCanonicalPlayerId(hostUid) : null;

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

        const companyFields: Record<string, unknown> = {};
        companyFields.managerParticipation = managerParticipation;
        if (payload.orgId) companyFields.orgId = payload.orgId;
        if (payload.templateId) companyFields.templateId = payload.templateId;
        if (payload.managerConfig) companyFields.managerConfig = payload.managerConfig;
        if (payload.analyticsEnabled != null) companyFields.analyticsEnabled = payload.analyticsEnabled;

        tx.set(gameRef, { ...baseDoc, ...companyFields });
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
