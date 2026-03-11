import { signInWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { normalizeEmail, normalizeWurderId } from "@/lib/auth/auth-helpers";
import type { UsernameLookup } from "@/lib/types/user";

export async function resolveLoginIdentifier(identifier: string): Promise<string> {
  const value = identifier.trim();

  if (!value) {
    throw new Error("Email or Wurder ID is required.");
  }

  if (value.includes("@")) {
    return normalizeEmail(value);
  }

  const usernameLower = normalizeWurderId(value);
  const usernameSnapshot = await getDoc(doc(db, "usernames", usernameLower));

  if (!usernameSnapshot.exists()) {
    throw new Error("No account found with that Wurder ID.");
  }

  const lookup = usernameSnapshot.data() as UsernameLookup;

  if (typeof lookup.email === "string" && lookup.email.trim().length > 0) {
    return normalizeEmail(lookup.email);
  }

  if (typeof lookup.uid === "string" && lookup.uid.trim().length > 0) {
    const userSnapshot = await getDoc(doc(db, "users", lookup.uid));
    if (!userSnapshot.exists()) {
      throw new Error("Could not find a user profile for that Wurder ID.");
    }

    const email = userSnapshot.data().email;
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new Error("No email is linked to that Wurder ID.");
    }

    return normalizeEmail(email);
  }

  throw new Error("Could not resolve login details for that Wurder ID.");
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
