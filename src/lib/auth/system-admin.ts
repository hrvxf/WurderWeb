import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { readEnv } from "@/lib/env";
import { adminAuth } from "@/lib/firebase/admin";
import { isSystemAdmin } from "@/lib/auth/system-admin-policy";

export class AdminUnauthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AdminUnauthenticatedError";
  }
}

export class AdminForbiddenError extends Error {
  constructor(message = "System admin access required.") {
    super(message);
    this.name = "AdminForbiddenError";
  }
}

function extractBearerToken(value: string | null): string | null {
  if (!value) return null;

  const [scheme, token] = value.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;

  const normalizedToken = token.trim();
  return normalizedToken || null;
}

export async function assertSystemAdmin(authorizationHeader: string | null): Promise<DecodedIdToken> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    throw new AdminUnauthenticatedError("Missing Firebase bearer token.");
  }

  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    throw new AdminUnauthenticatedError(
      error instanceof Error ? error.message : "Invalid Firebase authentication token."
    );
  }

  if (!isSystemAdmin(decodedToken, readEnv("SYSTEM_ADMIN_UID_ALLOWLIST"))) {
    throw new AdminForbiddenError();
  }

  return decodedToken;
}
