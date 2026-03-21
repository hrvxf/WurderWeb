import { signInWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { isValidEmail, normalizeEmail, normalizeWurderId } from "@/lib/auth/auth-helpers";
import type { UsernameLookup } from "@/lib/types/user";

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
    getDoc(doc(db, "users", uid)),
    getDoc(doc(db, "accounts", uid)),
  ]);

  const userData = usersSnapshot.exists() ? usersSnapshot.data() : null;
  if (typeof userData?.email === "string" && userData.email.trim()) {
    return normalizeEmail(userData.email);
  }

  const accountData = accountsSnapshot.exists() ? accountsSnapshot.data() : null;
  if (typeof accountData?.email === "string" && accountData.email.trim()) {
    return normalizeEmail(accountData.email);
  }

  return null;
}

async function resolveByUsernameCollection(usernameCandidate: string): Promise<string | null> {
  const usernameLower = normalizeWurderId(usernameCandidate);
  const usernameSnapshot = await getDoc(doc(db, "usernames", usernameLower));

  if (!usernameSnapshot.exists()) {
    return null;
  }

  const lookup = usernameSnapshot.data() as UsernameLookup;
  if (typeof lookup.email === "string" && lookup.email.trim().length > 0) {
    return normalizeEmail(lookup.email);
  }

  if (typeof lookup.uid === "string" && lookup.uid.trim().length > 0) {
    const uidEmail = await resolveEmailFromUid(lookup.uid);
    if (uidEmail) return uidEmail;
    throw new Error("That Wurder ID is missing login metadata. Please sign in with email.");
  }

  throw new Error("Could not resolve login details for that Wurder ID.");
}

async function resolveByAccountQuery(usernameCandidate: string): Promise<string | null> {
  const usernameLower = normalizeWurderId(usernameCandidate);
  const usersRef = collection(db, "users");
  const lookupQueries = [
    query(usersRef, where("usernameLower", "==", usernameLower), limit(1)),
    query(usersRef, where("wurderIdLower", "==", usernameLower), limit(1)),
    query(usersRef, where("username", "==", usernameCandidate.trim()), limit(1)),
    query(usersRef, where("wurderId", "==", usernameCandidate.trim()), limit(1)),
  ];

  for (const currentQuery of lookupQueries) {
    const snapshot = await getDocs(currentQuery);
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

export async function resolveLoginIdentifier(identifier: string): Promise<string> {
  const { raw, usernameCandidate, forceUsernameLookup } = normalizeIdentifierInput(identifier);

  if (!raw) {
    throw new Error("Email or Wurder ID is required.");
  }

  if (!forceUsernameLookup && raw.includes("@")) {
    if (!isValidEmail(raw)) {
      throw new Error("Invalid email format.");
    }
    return normalizeEmail(raw);
  }

  const usernameEmail = await resolveByUsernameCollection(usernameCandidate);
  if (usernameEmail) {
    return usernameEmail;
  }

  const accountEmail = await resolveByAccountQuery(usernameCandidate);
  if (accountEmail) {
    return accountEmail;
  }

  throw new Error("No account found with that Wurder ID.");
}

export async function loginWithEmailOrWurderId(
  identifier: string,
  password: string
): Promise<UserCredential> {
  if (!password.trim()) {
    throw new Error("Password is required.");
  }

  const email = await resolveLoginIdentifier(identifier);
  return signInWithEmailAndPassword(auth, email, password);
}
