import "server-only";

import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";

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
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      throw new CurrentUserUnauthenticatedError(error.message);
    }

    if (error instanceof FirebaseAuthInfrastructureError) {
      throw new CurrentUserInfrastructureError(error.message);
    }

    throw error;
  }
}
