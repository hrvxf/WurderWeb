import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  CreateGameAuthInfrastructureError,
  UnauthenticatedCreateGameError,
  verifyFirebaseAuthHeader,
} from "@/lib/game/create-game";

type GameAccessDoc = {
  createdByAccountId?: unknown;
  managerAccountId?: unknown;
  orgId?: unknown;
};

type OrganizationAccessDoc = {
  ownerAccountId?: unknown;
};

export class ManagerUnauthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "ManagerUnauthenticatedError";
  }
}

export class ManagerForbiddenError extends Error {
  constructor(message = "You are not authorized to manage this game.") {
    super(message);
    this.name = "ManagerForbiddenError";
  }
}

export class ManagerGameNotFoundError extends Error {
  constructor(message = "Game not found.") {
    super(message);
    this.name = "ManagerGameNotFoundError";
  }
}

export class ManagerAccessInfrastructureError extends Error {
  constructor(message = "Unable to verify Firebase auth token on server.") {
    super(message);
    this.name = "ManagerAccessInfrastructureError";
  }
}

export type ManagerOwnershipSource =
  | "game.createdByAccountId"
  | "game.managerAccountId"
  | "orgs.ownerAccountId"
  | "organizations.ownerAccountId";

export type ManagerAccessResult = {
  uid: string;
  ownershipSource: ManagerOwnershipSource;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function assertManagerAccessForGame(
  authorizationHeader: string | null,
  gameCode: string
): Promise<ManagerAccessResult> {
  let uid: string;
  try {
    uid = await verifyFirebaseAuthHeader(authorizationHeader);
  } catch (error) {
    if (error instanceof UnauthenticatedCreateGameError) {
      throw new ManagerUnauthenticatedError(error.message);
    }

    if (error instanceof CreateGameAuthInfrastructureError) {
      throw new ManagerAccessInfrastructureError(error.message);
    }

    throw error;
  }

  const normalizedCode = gameCode.trim();
  const gameRef = adminDb.collection("games").doc(normalizedCode);
  const gameDoc = await gameRef.get();

  if (!gameDoc.exists) {
    throw new ManagerGameNotFoundError();
  }

  const gameData = (gameDoc.data() ?? {}) as GameAccessDoc;
  const createdByAccountId = asNonEmptyString(gameData.createdByAccountId);
  if (createdByAccountId && createdByAccountId === uid) {
    return { uid, ownershipSource: "game.createdByAccountId" };
  }

  const managerAccountId = asNonEmptyString(gameData.managerAccountId);
  if (managerAccountId && managerAccountId === uid) {
    return { uid, ownershipSource: "game.managerAccountId" };
  }

  const orgId = asNonEmptyString(gameData.orgId);
  if (orgId) {
    const canonicalOrgDoc = await adminDb.collection("orgs").doc(orgId).get();
    if (canonicalOrgDoc.exists) {
      const orgData = (canonicalOrgDoc.data() ?? {}) as OrganizationAccessDoc;
      const ownerAccountId = asNonEmptyString(orgData.ownerAccountId);
      if (ownerAccountId && ownerAccountId === uid) {
        return { uid, ownershipSource: "orgs.ownerAccountId" };
      }
    }

    const legacyOrgDoc = await adminDb.collection("organizations").doc(orgId).get();
    if (legacyOrgDoc.exists) {
      const orgData = (legacyOrgDoc.data() ?? {}) as OrganizationAccessDoc;
      const ownerAccountId = asNonEmptyString(orgData.ownerAccountId);
      if (ownerAccountId && ownerAccountId === uid) {
        return { uid, ownershipSource: "organizations.ownerAccountId" };
      }
    }
  }

  throw new ManagerForbiddenError();
}
