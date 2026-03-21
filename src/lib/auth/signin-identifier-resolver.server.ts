import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { isValidEmail, normalizeEmail, normalizeWurderId } from "@/lib/auth/auth-helpers";
import type { UsernameLookup } from "@/lib/types/user";

export class InvalidIdentifierError extends Error {}
export class WurderIdNotFoundError extends Error {}

function normalizeIdentifierInput(identifier: string): {
  raw: string;
  usernameCandidate: string;
  forceUsernameLookup: boolean;
} {
  const raw = identifier.trim();
  const forceUsernameLookup = raw.startsWith("@") && !raw.slice(1).includes("@");
  const usernameCandidate = forceUsernameLookup ? raw.slice(1).trim() : raw;
  return {
    raw,
    usernameCandidate,
    forceUsernameLookup,
  };
}

async function resolveEmailFromUid(uid: string): Promise<string | null> {
  const [usersSnapshot, accountsSnapshot] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("accounts").doc(uid).get(),
  ]);

  const userData = usersSnapshot.exists ? usersSnapshot.data() : null;
  if (typeof userData?.email === "string" && userData.email.trim()) {
    return normalizeEmail(userData.email);
  }

  const accountData = accountsSnapshot.exists ? accountsSnapshot.data() : null;
  if (typeof accountData?.email === "string" && accountData.email.trim()) {
    return normalizeEmail(accountData.email);
  }

  return null;
}

async function resolveByUsernameCollection(usernameCandidate: string): Promise<string | null> {
  const usernameLower = normalizeWurderId(usernameCandidate);
  const usernameSnapshot = await adminDb.collection("usernames").doc(usernameLower).get();

  if (!usernameSnapshot.exists) {
    return null;
  }

  const lookup = usernameSnapshot.data() as UsernameLookup;
  if (typeof lookup.email === "string" && lookup.email.trim()) {
    return normalizeEmail(lookup.email);
  }

  if (typeof lookup.uid === "string" && lookup.uid.trim()) {
    return resolveEmailFromUid(lookup.uid);
  }

  return null;
}

async function resolveByAccountQuery(usernameCandidate: string): Promise<string | null> {
  const usernameLower = normalizeWurderId(usernameCandidate);

  const lookupQueries: Array<[field: string, value: string]> = [
    ["usernameLower", usernameLower],
    ["wurderIdLower", usernameLower],
    ["username", usernameCandidate.trim()],
    ["wurderId", usernameCandidate.trim()],
  ];

  for (const [field, value] of lookupQueries) {
    const snapshot = await adminDb.collection("accounts").where(field, "==", value).limit(1).get();
    const match = snapshot.docs[0];
    const data = match?.data();
    if (typeof data?.email === "string" && data.email.trim()) {
      return normalizeEmail(data.email);
    }
    if (typeof data?.uid === "string" && data.uid.trim()) {
      const uidEmail = await resolveEmailFromUid(data.uid);
      if (uidEmail) return uidEmail;
    }
  }

  return null;
}

export async function resolveSignInTarget(identifier: string): Promise<{ mode: "email"; email: string }> {
  const { raw, usernameCandidate, forceUsernameLookup } = normalizeIdentifierInput(identifier);

  if (!raw) {
    throw new InvalidIdentifierError("Email or Wurder ID is required.");
  }

  if (!forceUsernameLookup && raw.includes("@")) {
    if (!isValidEmail(raw)) {
      throw new InvalidIdentifierError("Invalid email format.");
    }

    return {
      mode: "email",
      email: normalizeEmail(raw),
    };
  }

  const usernameEmail = await resolveByUsernameCollection(usernameCandidate);
  if (usernameEmail) {
    return { mode: "email", email: usernameEmail };
  }

  const accountEmail = await resolveByAccountQuery(usernameCandidate);
  if (accountEmail) {
    return { mode: "email", email: accountEmail };
  }

  throw new WurderIdNotFoundError("No account found with that Wurder ID.");
}
