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
import {
  buildName,
  isValidWurderId,
  normalizeEmail,
  normalizePersonName,
  normalizeWurderId,
} from "@/lib/auth/auth-helpers";
import { getProfileCompletionStatus, isProfileComplete } from "@/lib/auth/profile-completion";
import { DEFAULT_PROFILE_STATS, type UsernameLookup, type WurderUserProfile } from "@/lib/types/user";

type EnsureProfileInput = {
  firstName?: string;
  lastName?: string;
  name?: string;
  wurderId?: string;
  avatar?: string | null;
};

type AppAccountProfile = {
  firstName?: string;
  lastName?: string;
  name?: string;
  wurderId?: string;
  wurderIdLower?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
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

function cleanName(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = normalizePersonName(value);
  return normalized.length > 0 ? normalized : undefined;
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

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
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

function hasRequiredIdentityFields(profile: Partial<WurderUserProfile> | null): boolean {
  if (!profile) return false;
  return Boolean(cleanText(profile.firstName) && cleanText(profile.lastName) && cleanText(profile.wurderId));
}

function hasAnyIdentityValue(profile: Partial<WurderUserProfile> | null): boolean {
  if (!profile) return false;
  return Boolean(cleanText(profile.firstName) || cleanText(profile.lastName) || cleanText(profile.wurderId));
}

function normalizeAppAccountProfile(data: DocumentData): AppAccountProfile {
  const source = data as Record<string, unknown>;
  const firstName = cleanName(typeof source.firstName === "string" ? source.firstName : undefined);
  const lastName =
    cleanName(typeof source.lastName === "string" ? source.lastName : undefined) ??
    cleanName(typeof source.secondName === "string" ? source.secondName : undefined);
  const wurderId =
    cleanText(typeof source.wurderId === "string" ? source.wurderId : undefined) ??
    cleanText(typeof source.username === "string" ? source.username : undefined);
  const wurderIdLower =
    cleanText(typeof source.wurderIdLower === "string" ? source.wurderIdLower : undefined) ??
    cleanText(typeof source.usernameLower === "string" ? source.usernameLower : undefined);
  const avatarUrl =
    cleanText(typeof source.avatarUrl === "string" ? source.avatarUrl : undefined) ??
    cleanText(typeof source.photoURL === "string" ? source.photoURL : undefined) ??
    cleanText(typeof source.avatar === "string" ? source.avatar : undefined) ??
    null;

  return {
    firstName,
    lastName,
    name: cleanName(typeof source.name === "string" ? source.name : undefined) ?? cleanName(buildName(firstName, lastName)),
    wurderId,
    wurderIdLower: wurderIdLower ?? (wurderId ? normalizeWurderId(wurderId) : undefined),
    avatar: avatarUrl,
    avatarUrl,
  };
}

async function readAppAccountProfile(uid: string): Promise<AppAccountProfile | null> {
  try {
    const accountRef = doc(db, "accounts", uid);
    const snapshot = await getDoc(accountRef);
    if (!snapshot.exists()) return null;
    return normalizeAppAccountProfile(snapshot.data());
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auth] Failed to read fallback account profile for uid ${uid}`, error);
    }
    return null;
  }
}

function mergeProfiles(
  uid: string,
  userProfile: WurderUserProfile | null,
  accountProfile: AppAccountProfile | null
): WurderUserProfile | null {
  if (!userProfile && !accountProfile) return null;

  const merged = {
    ...(userProfile ?? {}),
    ...(accountProfile ?? {}),
    uid,
    email: userProfile?.email ?? null,
    stats: normalizeStats(userProfile?.stats),
  } as WurderUserProfile;

  if (!cleanText(merged.firstName) && accountProfile?.firstName) {
    merged.firstName = accountProfile.firstName;
  }
  if (!cleanText(merged.lastName) && accountProfile?.lastName) {
    merged.lastName = accountProfile.lastName;
  }
  if (!cleanText(merged.wurderId) && accountProfile?.wurderId) {
    merged.wurderId = accountProfile.wurderId;
    merged.wurderIdLower = accountProfile.wurderIdLower;
  }
  if (!cleanText(merged.name)) {
    merged.name = cleanName(buildName(merged.firstName, merged.lastName));
  }
  if (!merged.avatarUrl && accountProfile?.avatarUrl) {
    merged.avatarUrl = accountProfile.avatarUrl;
  }
  if (!merged.avatar && (merged.avatarUrl ?? accountProfile?.avatar)) {
    merged.avatar = merged.avatarUrl ?? accountProfile?.avatar ?? null;
  }

  return merged;
}

async function backfillUsersFromMergedProfile(
  uid: string,
  usersProfile: WurderUserProfile | null,
  mergedProfile: WurderUserProfile,
  accountProfile: AppAccountProfile | null
): Promise<void> {
  if (!accountProfile) return;

  const userRef = doc(db, "users", uid);
  const firestoreUpdates: Record<string, unknown> = {
    uid,
    updatedAt: serverTimestamp(),
  };

  if (!usersProfile) {
    firestoreUpdates.email = mergedProfile.email ?? null;
    firestoreUpdates.stats = normalizeStats(mergedProfile.stats);
    firestoreUpdates.activeGame = mergedProfile.activeGame ?? null;
  }

  if (cleanText(mergedProfile.firstName) && cleanText(usersProfile?.firstName) !== cleanText(mergedProfile.firstName)) {
    firestoreUpdates.firstName = mergedProfile.firstName;
  }
  if (cleanText(mergedProfile.lastName) && cleanText(usersProfile?.lastName) !== cleanText(mergedProfile.lastName)) {
    firestoreUpdates.lastName = mergedProfile.lastName;
  }
  if (cleanText(mergedProfile.name) && cleanText(usersProfile?.name) !== cleanText(mergedProfile.name)) {
    firestoreUpdates.name = mergedProfile.name;
  }
  if (cleanText(mergedProfile.wurderId) && cleanText(usersProfile?.wurderId) !== cleanText(mergedProfile.wurderId)) {
    firestoreUpdates.wurderId = mergedProfile.wurderId;
    firestoreUpdates.wurderIdLower =
      cleanText(mergedProfile.wurderIdLower) ?? normalizeWurderId(mergedProfile.wurderId ?? "");
  }
  if (mergedProfile.avatarUrl && usersProfile?.avatarUrl !== mergedProfile.avatarUrl) {
    firestoreUpdates.avatarUrl = mergedProfile.avatarUrl;
  }
  if (mergedProfile.avatar && usersProfile?.avatar !== mergedProfile.avatar) {
    firestoreUpdates.avatar = mergedProfile.avatar;
  }

  const hasChanges = Object.keys(firestoreUpdates).length > 2 || !usersProfile;
  if (!hasChanges) return;

  const profileComplete = isProfileComplete(mergedProfile);
  firestoreUpdates.onboarding = {
    ...(usersProfile?.onboarding ?? {}),
    profileComplete,
  };

  await setDoc(userRef, firestoreUpdates, { merge: true });
}

export async function fetchUserProfile(uid: string): Promise<WurderUserProfile | null> {
  const userRef = doc(db, "users", uid);
  const userSnapshot = await getDoc(userRef);
  const usersProfile = userSnapshot.exists() ? normalizeProfile(uid, userSnapshot.data(), null) : null;
  const accountProfile = await readAppAccountProfile(uid);
  const profile = mergeProfiles(uid, usersProfile, accountProfile);

  if (!profile) return null;

  if (hasAnyIdentityValue(usersProfile) && !hasRequiredIdentityFields(usersProfile) && hasRequiredIdentityFields(profile)) {
    console.warn(`[auth] profile-bootstrap recovered missing canonical identity fields for uid ${uid}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("PROFILE_HYDRATE_PAYLOAD", { uid, usersProfile, accountProfile });
    console.info("RESOLVED_PROFILE", { uid, resolvedProfile: profile });
    console.info("COMPLETION_CHECK", {
      uid,
      ...getProfileCompletionStatus(profile),
    });
  }

  const profileComplete = isProfileComplete(profile);

  await backfillUsersFromMergedProfile(uid, usersProfile, profile, accountProfile);

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
  const accountProfile = await readAppAccountProfile(uid);

  const firstName = cleanName(seed.firstName);
  const lastName = cleanName(seed.lastName);
  const authDisplayName = cleanName(user.displayName);
  const fallbackName = buildName(firstName, lastName);
  const name =
    cleanName(seed.name) ??
    cleanName(accountProfile?.name) ??
    authDisplayName ??
    cleanName(fallbackName) ??
    cleanName(buildName(accountProfile?.firstName, accountProfile?.lastName));
  const email = user.email ? normalizeEmail(user.email) : null;
  const avatar = seed.avatar ?? user.photoURL ?? accountProfile?.avatarUrl ?? null;

  const requestedWurderId = cleanText(seed.wurderId);
  const requestedWurderIdLower = requestedWurderId
    ? await claimUsernameForUser({
        uid,
        email,
        wurderId: requestedWurderId,
      })
    : undefined;
  const fallbackWurderId = cleanText(accountProfile?.wurderId);

  if (!snapshot.exists()) {
    const createdProfile = withoutUndefined({
      uid,
      email,
      firstName: firstName ?? accountProfile?.firstName ?? "",
      lastName: lastName ?? accountProfile?.lastName ?? "",
      name,
      avatar,
      avatarUrl: avatar,
      stats: { ...DEFAULT_PROFILE_STATS },
      activeGame: null,
      onboarding: { profileComplete: false },
    }) as WurderUserProfile;

    if (requestedWurderId && requestedWurderIdLower) {
      createdProfile.wurderId = requestedWurderId;
      createdProfile.wurderIdLower = requestedWurderIdLower;
    } else if (fallbackWurderId) {
      createdProfile.wurderId = fallbackWurderId;
      createdProfile.wurderIdLower = normalizeWurderId(fallbackWurderId);
    }

    const profileComplete = isProfileComplete(createdProfile);

    await setDoc(userRef, withoutUndefined({
      ...createdProfile,
      onboarding: {
        ...(createdProfile.onboarding ?? {}),
        profileComplete,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    return {
      ...createdProfile,
      onboarding: {
        ...(createdProfile.onboarding ?? {}),
        profileComplete,
      },
    };
  }

  const currentProfile = normalizeProfile(uid, snapshot.data(), email);
  const mergedCurrentProfile = mergeProfiles(uid, currentProfile, accountProfile) ?? currentProfile;

  if (
    hasAnyIdentityValue(currentProfile) &&
    !hasRequiredIdentityFields(currentProfile) &&
    hasRequiredIdentityFields(mergedCurrentProfile)
  ) {
    console.warn(`[auth] profile-bootstrap backfilled missing canonical identity fields for uid ${uid}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("PROFILE_HYDRATE_PAYLOAD", {
      uid,
      usersProfile: currentProfile,
      accountProfile,
      authSession: {
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        photoURL: user.photoURL ?? null,
      },
    });
    console.info("RESOLVED_PROFILE", { uid, resolvedProfile: mergedCurrentProfile });
    console.info("COMPLETION_CHECK", {
      uid,
      ...getProfileCompletionStatus(mergedCurrentProfile),
    });
  }

  const firestoreUpdates: Record<string, unknown> = {
    uid,
    updatedAt: serverTimestamp(),
  };
  const memoryUpdates: Partial<WurderUserProfile> = { uid };

  if (!currentProfile.email && email) {
    firestoreUpdates.email = email;
    memoryUpdates.email = email;
  }

  if (cleanText(mergedCurrentProfile.name) && cleanText(currentProfile.name) !== cleanText(mergedCurrentProfile.name)) {
    firestoreUpdates.name = mergedCurrentProfile.name;
    memoryUpdates.name = mergedCurrentProfile.name;
  }

  if (cleanText(mergedCurrentProfile.firstName) && cleanText(currentProfile.firstName) !== cleanText(mergedCurrentProfile.firstName)) {
    firestoreUpdates.firstName = mergedCurrentProfile.firstName;
    memoryUpdates.firstName = mergedCurrentProfile.firstName;
  }

  if (cleanText(mergedCurrentProfile.lastName) && cleanText(currentProfile.lastName) !== cleanText(mergedCurrentProfile.lastName)) {
    firestoreUpdates.lastName = mergedCurrentProfile.lastName;
    memoryUpdates.lastName = mergedCurrentProfile.lastName;
  }

  if (mergedCurrentProfile.avatar && currentProfile.avatar !== mergedCurrentProfile.avatar) {
    firestoreUpdates.avatar = mergedCurrentProfile.avatar;
    memoryUpdates.avatar = mergedCurrentProfile.avatar;
  }

  if (mergedCurrentProfile.avatarUrl && currentProfile.avatarUrl !== mergedCurrentProfile.avatarUrl) {
    firestoreUpdates.avatarUrl = mergedCurrentProfile.avatarUrl;
    memoryUpdates.avatarUrl = mergedCurrentProfile.avatarUrl;
  }

  if (cleanText(mergedCurrentProfile.wurderId) && cleanText(currentProfile.wurderId) !== cleanText(mergedCurrentProfile.wurderId)) {
    firestoreUpdates.wurderId = mergedCurrentProfile.wurderId;
    firestoreUpdates.wurderIdLower =
      cleanText(mergedCurrentProfile.wurderIdLower) ??
      (mergedCurrentProfile.wurderId ? normalizeWurderId(mergedCurrentProfile.wurderId) : undefined);
    memoryUpdates.wurderId = mergedCurrentProfile.wurderId;
    memoryUpdates.wurderIdLower =
      cleanText(mergedCurrentProfile.wurderIdLower) ??
      (mergedCurrentProfile.wurderId ? normalizeWurderId(mergedCurrentProfile.wurderId) : undefined);
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
    const firstName = cleanName(input.firstName);
    if (firstName) {
      firestoreUpdates.firstName = firstName;
      memoryUpdates.firstName = firstName;
    } else if (cleanText(currentProfile.firstName)) {
      console.warn(`[auth] Ignored empty firstName update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("lastName" in input) {
    const lastName = cleanName(input.lastName);
    if (lastName) {
      firestoreUpdates.lastName = lastName;
      memoryUpdates.lastName = lastName;
    } else if (cleanText(currentProfile.lastName)) {
      console.warn(`[auth] Ignored empty lastName update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("name" in input) {
    const name = cleanName(input.name);
    if (name) {
      firestoreUpdates.name = name;
      memoryUpdates.name = name;
    } else if (cleanText(currentProfile.name)) {
      console.warn(`[auth] Ignored empty name update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("avatar" in input) {
    const avatar = cleanText(input.avatar ?? undefined);
    if (avatar) {
      firestoreUpdates.avatar = avatar;
      memoryUpdates.avatar = avatar;
    } else if (currentProfile.avatar) {
      console.warn(`[auth] Ignored empty avatar update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("avatarUrl" in input) {
    const avatarUrl = cleanText(input.avatarUrl ?? undefined);
    if (avatarUrl) {
      firestoreUpdates.avatarUrl = avatarUrl;
      memoryUpdates.avatarUrl = avatarUrl;
    } else if (currentProfile.avatarUrl) {
      console.warn(`[auth] Ignored empty avatarUrl update for uid ${uid} to preserve canonical profile data`);
    }
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
