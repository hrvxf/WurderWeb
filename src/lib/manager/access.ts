import "server-only";

import {
  assertManagerRouteAccess,
  GuardAuthInfrastructureError,
  GuardForbiddenError,
  GuardNotFoundError,
  GuardUnauthenticatedError,
  type ManagerGuardOwnershipSource,
} from "@/lib/auth/guards";

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

export type ManagerOwnershipSource = ManagerGuardOwnershipSource;

export type ManagerAccessResult = {
  uid: string;
  ownershipSource: ManagerOwnershipSource;
};

export async function assertManagerAccessForGame(
  authorizationHeader: string | null,
  gameCode: string
): Promise<ManagerAccessResult> {
  try {
    const access = await assertManagerRouteAccess({ authorizationHeader, gameCode });
    return { uid: access.uid, ownershipSource: access.ownershipSource };
  } catch (error) {
    if (error instanceof GuardUnauthenticatedError) {
      throw new ManagerUnauthenticatedError(error.message);
    }

    if (error instanceof GuardAuthInfrastructureError) {
      throw new ManagerAccessInfrastructureError(error.message);
    }

    if (error instanceof GuardNotFoundError && error.code === "GAME_NOT_FOUND") {
      throw new ManagerGameNotFoundError(error.message);
    }

    if (error instanceof GuardForbiddenError) {
      throw new ManagerForbiddenError(error.message);
    }

    throw error;
  }
}
