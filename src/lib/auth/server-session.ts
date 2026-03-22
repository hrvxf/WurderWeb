import "server-only";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { isProfileComplete } from "@/lib/auth/profile-completion";
import type { WurderUserProfile } from "@/lib/types/user";

export const AUTH_SESSION_COOKIE_NAME = "__session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

function extractBearerToken(value: string | null): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getSessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  };
}

export function getClearedSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(),
    maxAge: 0,
  };
}

export async function createSessionCookieFromAuthorization(
  authorizationHeader: string | null
): Promise<string | null> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;
  await adminAuth.verifyIdToken(token);
  return adminAuth.createSessionCookie(token, { expiresIn: SESSION_DURATION_MS });
}

export async function verifySessionCookieValue(
  sessionCookie: string | null
): Promise<{ uid: string } | null> {
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}

type UserOnboardingDoc = {
  onboarding?: {
    profileComplete?: unknown;
  };
  firstName?: unknown;
  lastName?: unknown;
  name?: unknown;
  wurderId?: unknown;
};

export async function isServerProfileComplete(uid: string): Promise<boolean> {
  const snapshot = await adminDb.collection("users").doc(uid).get();
  if (!snapshot.exists) return false;

  const data = (snapshot.data() ?? {}) as UserOnboardingDoc;
  if (typeof data.onboarding?.profileComplete === "boolean") {
    return data.onboarding.profileComplete;
  }

  const profile: WurderUserProfile = {
    uid,
    email: null,
    firstName: typeof data.firstName === "string" ? data.firstName : undefined,
    lastName: typeof data.lastName === "string" ? data.lastName : undefined,
    name: typeof data.name === "string" ? data.name : undefined,
    wurderId: typeof data.wurderId === "string" ? data.wurderId : undefined,
  };
  return isProfileComplete(profile);
}
