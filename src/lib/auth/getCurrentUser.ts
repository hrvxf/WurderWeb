import "server-only";

import {
  CreateGameAuthInfrastructureError,
  UnauthenticatedCreateGameError,
  verifyFirebaseAuthHeader,
} from "@/lib/game/create-game";

export class CurrentUserUnauthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "CurrentUserUnauthenticatedError";
  }
}

export class CurrentUserInfrastructureError extends Error {
  constructor(message = "Unable to verify Firebase auth token on server.") {
    super(message);
    this.name = "CurrentUserInfrastructureError";
  }
}

export async function getCurrentUser(authorizationHeader: string | null): Promise<{ uid: string }> {
  try {
    const uid = await verifyFirebaseAuthHeader(authorizationHeader);
    return { uid };
  } catch (error) {
    if (error instanceof UnauthenticatedCreateGameError) {
      throw new CurrentUserUnauthenticatedError(error.message);
    }

    if (error instanceof CreateGameAuthInfrastructureError) {
      throw new CurrentUserInfrastructureError(error.message);
    }

    throw error;
  }
}
