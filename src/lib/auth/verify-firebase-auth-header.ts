import "server-only";

import { adminAuth } from "@/lib/firebase/admin";

export class FirebaseAuthUnauthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "FirebaseAuthUnauthenticatedError";
  }
}

export class FirebaseAuthInfrastructureError extends Error {
  constructor(message = "Unable to verify Firebase auth token on server.") {
    super(message);
    this.name = "FirebaseAuthInfrastructureError";
  }
}

function extractBearerToken(value: string | null): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function verifyFirebaseAuthHeader(authorization: string | null): Promise<string> {
  const token = extractBearerToken(authorization);
  if (!token) {
    throw new FirebaseAuthUnauthenticatedError("Missing Firebase bearer token.");
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";

    if (code.includes("auth/internal-error")) {
      throw new FirebaseAuthInfrastructureError(
        error instanceof Error
          ? error.message
          : "Firebase auth verification failed on server."
      );
    }

    throw new FirebaseAuthUnauthenticatedError(
      error instanceof Error
        ? error.message
        : "Authentication token verification failed."
    );
  }
}

