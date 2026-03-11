import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { buildName, isValidWurderId, normalizeEmail, normalizeWurderId } from "@/lib/auth/auth-helpers";
import { isProfileComplete } from "@/lib/auth/profile-completion";
import { DEFAULT_PROFILE_STATS, type UsernameLookup, type WurderUserProfile } from "@/lib/types/user";

type EnsureProfileInput = {
  firstName?: string;
  lastName?: string;
  name?: string;
  wurderId?: string;
  avatar?: string | null;
};

export type UpdateUserProfileInput = {
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  wurderId?: string;
};

export class UsernameTakenError extends Error {
  constructor(message = "That Wurder ID is already taken.") {
    super(message);
    this.name = "UsernameTakenError";
  }
}

function cleanText(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function normalizeStats(stats: unknown): WurderUserProfile["stats"] {
  if (!stats || typeof stats !== "object") {
    return { ...DEFAULT_PROFILE_STATS };
  }
  return {
    ...DEFAULT_PROFILE_STATS,
    ...(stats as Record<string, number>),
  };
}

function normalizeProfile(
  uid: string,
  data: DocumentData,
  emailFallback: string | null
): WurderUserProfile {
  const source = data as Partial<WurderUserProfile>;
  const email = typeof source.email === "string" ? source.email : emailFallback;
  return {
    ...source,
    uid,
    email: email ?? null,
    stats: normalizeStats(source.stats),
  };
}

export async function fetchUserProfile(uid: string): Promise<WurderUserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) return null;

  const profile = normalizeProfile(uid, snapshot.data(), null);
  const profileComplete = isProfileComplete(profile);
  return {
    ...profile,
    onboarding: {
      ...(profile.onboarding ?? {}),
      profileComplete:
        typeof profile.onboarding?.profileComplete === "boolean"
          ? profile.onboarding.profileComplete
          : profileComplete,
    },
  };
}

export async function claimUsernameForUser(input: {
  uid: string;
  email?: string | null;
  wurderId: string;
}): Promise<string> {
  const normalized = normalizeWurderId(input.wurderId);
  const formatted = input.wurderId.trim();
  const normalizedEmail = input.email ? normalizeEmail(input.email) : undefined;

  if (!isValidWurderId(formatted)) {
    throw new Error("Wurder ID must be 3-20 characters using letters, numbers, or underscores.");
  }

  await runTransaction(db, async (transaction) => {
    const lookupRef = doc(db, "usernames", normalized);
    const existing = await transaction.get(lookupRef);

    if (existing.exists()) {
      const existingData = existing.data() as UsernameLookup;
      const existingUid = typeof existingData.uid === "string" ? existingData.uid : undefined;
      const existingEmail =
        typeof existingData.email === "string" ? normalizeEmail(existingData.email) : undefined;

      const ownedBySameUser =
        existingUid === input.uid || (Boolean(normalizedEmail) && existingEmail === normalizedEmail);

      if (!ownedBySameUser) {
        throw new UsernameTakenError();
      }

      return;
    }

    transaction.set(lookupRef, {
      username: formatted,
      usernameLower: normalized,
      uid: input.uid,
      email: normalizedEmail ?? "",
      createdAt: serverTimestamp(),
    } satisfies UsernameLookup);
  });

  return normalized;
}

export async function ensureUserProfile(
  user: User,
  seed: EnsureProfileInput = {}
): Promise<WurderUserProfile> {
  const uid = user.uid;
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  const firstName = cleanText(seed.firstName);
  const lastName = cleanText(seed.lastName);
  const authDisplayName = cleanText(user.displayName);
  const fallbackName = buildName(firstName, lastName);
  const name = cleanText(seed.name) ?? authDisplayName ?? cleanText(fallbackName);
  const email = user.email ? normalizeEmail(user.email) : null;
  const avatar = seed.avatar ?? user.photoURL ?? null;

  const requestedWurderId = cleanText(seed.wurderId);
  const requestedWurderIdLower = requestedWurderId
    ? await claimUsernameForUser({
        uid,
        email,
        wurderId: requestedWurderId,
      })
    : undefined;

  if (!snapshot.exists()) {
    const createdProfile: WurderUserProfile = {
      uid,
      email,
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      name,
      avatar,
      avatarUrl: avatar,
      stats: { ...DEFAULT_PROFILE_STATS },
      activeGame: null,
      onboarding: { profileComplete: false },
    };

    if (requestedWurderId && requestedWurderIdLower) {
      createdProfile.wurderId = requestedWurderId;
      createdProfile.wurderIdLower = requestedWurderIdLower;
    }

    const profileComplete = isProfileComplete(createdProfile);

    await setDoc(userRef, {
      ...createdProfile,
      onboarding: {
        ...(createdProfile.onboarding ?? {}),
        profileComplete,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      ...createdProfile,
      onboarding: {
        ...(createdProfile.onboarding ?? {}),
        profileComplete,
      },
    };
  }

  const currentProfile = normalizeProfile(uid, snapshot.data(), email);

  const firestoreUpdates: Record<string, unknown> = {
    uid,
    updatedAt: serverTimestamp(),
  };
  const memoryUpdates: Partial<WurderUserProfile> = { uid };

  if (!currentProfile.email && email) {
    firestoreUpdates.email = email;
    memoryUpdates.email = email;
  }

  if (!currentProfile.name && name) {
    firestoreUpdates.name = name;
    memoryUpdates.name = name;
  }

  if (!cleanText(currentProfile.firstName) && firstName) {
    firestoreUpdates.firstName = firstName;
    memoryUpdates.firstName = firstName;
  }

  if (!cleanText(currentProfile.lastName) && lastName) {
    firestoreUpdates.lastName = lastName;
    memoryUpdates.lastName = lastName;
  }

  if (!currentProfile.avatar && avatar) {
    firestoreUpdates.avatar = avatar;
    memoryUpdates.avatar = avatar;
  }

  if (!currentProfile.avatarUrl && avatar) {
    firestoreUpdates.avatarUrl = avatar;
    memoryUpdates.avatarUrl = avatar;
  }

  if (!cleanText(currentProfile.wurderId) && requestedWurderId && requestedWurderIdLower) {
    firestoreUpdates.wurderId = requestedWurderId;
    firestoreUpdates.wurderIdLower = requestedWurderIdLower;
    memoryUpdates.wurderId = requestedWurderId;
    memoryUpdates.wurderIdLower = requestedWurderIdLower;
  }

  const nextProfile: WurderUserProfile = {
    ...currentProfile,
    ...memoryUpdates,
  };

  const profileComplete = isProfileComplete(nextProfile);
  firestoreUpdates.onboarding = {
    ...(currentProfile.onboarding ?? {}),
    profileComplete,
  };

  await setDoc(userRef, firestoreUpdates, { merge: true });

  return {
    ...nextProfile,
    onboarding: {
      ...(nextProfile.onboarding ?? {}),
      profileComplete,
    },
  };
}

export async function updateUserProfile(
  uid: string,
  input: UpdateUserProfileInput
): Promise<WurderUserProfile> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error("Profile not found.");
  }

  const currentProfile = normalizeProfile(uid, snapshot.data(), null);
  const firestoreUpdates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  const memoryUpdates: Partial<WurderUserProfile> = {};

  if ("firstName" in input) {
    const firstName = cleanText(input.firstName) ?? "";
    firestoreUpdates.firstName = firstName;
    memoryUpdates.firstName = firstName;
  }

  if ("lastName" in input) {
    const lastName = cleanText(input.lastName) ?? "";
    firestoreUpdates.lastName = lastName;
    memoryUpdates.lastName = lastName;
  }

  if ("name" in input) {
    const name = cleanText(input.name) ?? "";
    firestoreUpdates.name = name;
    memoryUpdates.name = name;
  }

  if ("avatar" in input) {
    const avatar = input.avatar ?? null;
    firestoreUpdates.avatar = avatar;
    memoryUpdates.avatar = avatar;
  }

  if ("avatarUrl" in input) {
    const avatarUrl = input.avatarUrl ?? null;
    firestoreUpdates.avatarUrl = avatarUrl;
    memoryUpdates.avatarUrl = avatarUrl;
  }

  if ("wurderId" in input && typeof input.wurderId === "string") {
    const candidateWurderId = input.wurderId.trim();
    const candidateLower = normalizeWurderId(candidateWurderId);
    const currentLower = cleanText(currentProfile.wurderIdLower);

    if (!candidateWurderId) {
      throw new Error("Wurder ID is required.");
    }

    if (currentLower && currentLower !== candidateLower) {
      throw new Error("Wurder ID cannot be changed once set.");
    }

    if (!currentLower) {
      await claimUsernameForUser({
        uid,
        email: currentProfile.email,
        wurderId: candidateWurderId,
      });
      firestoreUpdates.wurderId = candidateWurderId;
      firestoreUpdates.wurderIdLower = candidateLower;
      memoryUpdates.wurderId = candidateWurderId;
      memoryUpdates.wurderIdLower = candidateLower;
    }
  }

  const nextProfile: WurderUserProfile = {
    ...currentProfile,
    ...memoryUpdates,
  };

  const profileComplete = isProfileComplete(nextProfile);
  firestoreUpdates.onboarding = {
    ...(currentProfile.onboarding ?? {}),
    profileComplete,
  };

  await setDoc(userRef, firestoreUpdates, { merge: true });

  return {
    ...nextProfile,
    onboarding: {
      ...(nextProfile.onboarding ?? {}),
      profileComplete,
    },
  };
}
