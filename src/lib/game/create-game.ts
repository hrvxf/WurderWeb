import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  buildInitialGameDoc,
  generateGameCode,
  resolveDefaultClassicWordGroupId,
} from "@/domain/game/create-game";

const MAX_GAME_CODE_ATTEMPTS = 6;

export type ManagerConfig = {
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
  orgId?: string;
  templateId?: string;
  analyticsEnabled?: boolean;
  managerConfig?: ManagerConfig;
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

export class CreateGameAuthInfrastructureError extends Error {
  constructor(message = "Unable to verify Firebase auth token on server.") {
    super(message);
    this.name = "CreateGameAuthInfrastructureError";
  }
}

function extractBearerToken(value: string | null): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

export async function verifyFirebaseAuthHeader(authorization: string | null): Promise<string> {
  const token = extractBearerToken(authorization);
  if (!token) {
    throw new UnauthenticatedCreateGameError("Missing Firebase bearer token.");
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code.includes("auth/invalid") || code.includes("auth/id-token") || code.includes("auth/argument-error")) {
      throw new UnauthenticatedCreateGameError(
        error instanceof Error ? error.message : "Invalid Firebase authentication token."
      );
    }

    if (code.includes("auth/internal-error")) {
      throw new CreateGameAuthInfrastructureError(
        error instanceof Error ? error.message : "Firebase auth verification failed on server."
      );
    }

    throw new UnauthenticatedCreateGameError(
      error instanceof Error ? error.message : "Authentication token verification failed."
    );
  }
}

export async function createGameForHostUid(input: string | CreateGameForHostUidInput): Promise<{ gameCode: string }> {
  const payload: CreateGameForHostUidInput = typeof input === "string" ? { hostUid: input } : input;
  const { hostUid } = payload;

  if (!hostUid) {
    throw new UnauthenticatedCreateGameError("Missing authenticated host uid.");
  }

  const wordGroupId = await resolveDefaultClassicWordGroupId(adminDb).catch(() => null);

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
          hostPlayerId: hostUid,
          createdAt: FieldValue.serverTimestamp(),
          wordGroupId,
          lastActionAt: Date.now(),
          classicMaxHuntersPerVictim: 3,
          classicPointsToWin: 25,
        });

        const companyFields =
          payload.orgId && payload.templateId && payload.managerConfig
            ? {
                orgId: payload.orgId,
                templateId: payload.templateId,
                analyticsEnabled: payload.analyticsEnabled ?? false,
                managerConfig: payload.managerConfig,
              }
            : {};

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
