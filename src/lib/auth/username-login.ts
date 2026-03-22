import { signInWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import {
  isValidEmail,
  isValidWurderId,
  normalizeEmail,
  normalizeWurderId,
} from "@/lib/auth/auth-helpers";
import type { UsernameLookup } from "@/lib/types/user";

export async function resolveLoginIdentifier(identifier: string): Promise<string> {
  const value = identifier.trim();

  if (!value) {
    throw new Error("Email or Wurder ID is required.");
  }

  const looksLikeEmail = value.includes("@") && !value.startsWith("@");
  if (looksLikeEmail) {
    if (!isValidEmail(value)) {
      throw new Error("Enter a valid email address.");
    }
    return normalizeEmail(value);
  }

  const wurderIdInput = value.startsWith("@") ? value.slice(1) : value;
  if (!isValidWurderId(wurderIdInput)) {
    throw new Error("Enter a valid Wurder ID (3-20 letters, numbers, or underscores).");
  }

  const usernameLower = normalizeWurderId(wurderIdInput);
  const usernameSnapshot = await getDoc(doc(db, "usernames", usernameLower));

  if (!usernameSnapshot.exists()) {
    throw new Error("No account found with that Wurder ID.");
  }

  const lookup = usernameSnapshot.data() as UsernameLookup;

  if (typeof lookup.email === "string" && lookup.email.trim().length > 0) {
    return normalizeEmail(lookup.email);
  }

  if (typeof lookup.uid === "string" && lookup.uid.trim().length > 0) {
    throw new Error("That Wurder ID is missing login metadata. Please sign in with email.");
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
