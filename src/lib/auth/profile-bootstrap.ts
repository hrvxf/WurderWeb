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
import { resolveCanonicalAccountProfile } from "@/lib/auth/canonical-account-resolver";
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

type LegacyAccountRawFields = {
  firstName?: string;
  lastName?: string;
  secondName?: string;
  username?: string;
  usernameLower?: string;
  photoURL?: string;
  avatarUrl?: string;
  avatar?: string;
  name?: string;
};

type AppAccountProfileResolution = {
  profile: AppAccountProfile;
  rawFields: LegacyAccountRawFields;
};

type FirestoreOp = "getDoc" | "setDoc" | "updateDoc" | "runTransaction";
type FirestoreRequirement = "required" | "optional";
type BootstrapStage =
  | "loadAccountProfile"
  | "ensureAccountDoc.readAccount"
  | "ensureAccountDoc.createAccount"
  | "updateAccountSnapshot.writeAccount"
  | "fetchUserProfile.readUser"
  | "ensureUserProfile.readUser"
  | "ensureUserProfile.create"
  | "ensureUserProfile.update"
  | "fetchUserProfile.backfillUsers"
  | "claimUsernameForUser.transaction";

function shouldLogBootstrapFirestoreDiagnostics(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_ENABLE_BOOTSTRAP_FIRESTORE_DIAGNOSTICS === "true";
}

function logBootstrapFirestoreOperation(input: {
  stage: BootstrapStage;
  op: FirestoreOp;
  path: string;
  uid: string;
  requirement: FirestoreRequirement;
  status: "start" | "success";
}): void {
  if (!shouldLogBootstrapFirestoreDiagnostics()) return;
  console.info("[auth] bootstrap firestore operation", {
    ...input,
    optional: input.requirement === "optional",
  });
}

function logBootstrapFirestoreFailure(input: {
  error: unknown;
  op: FirestoreOp;
  path: string;
  stage: BootstrapStage;
  uid: string;
  requirement: FirestoreRequirement;
}): void {
  const code =
    typeof input.error === "object" && input.error && "code" in input.error
      ? String((input.error as { code?: unknown }).code ?? "")
      : "";
  const message =
    typeof input.error === "object" && input.error && "message" in input.error
      ? String((input.error as { message?: unknown }).message ?? "")
      : "";
  const permissionDenied = code.includes("permission-denied") || message.includes("Missing or insufficient permissions");
  const summary = {
    op: input.op,
    path: input.path,
    stage: input.stage,
    uid: input.uid,
    requirement: input.requirement,
    optional: input.requirement === "optional",
    permissionDenied,
    code: code || undefined,
    message: message || undefined,
  };

  if (process.env.NODE_ENV === "production") {
    console.error("[auth] bootstrap firestore operation failed", summary);
    return;
  }

  console.warn("[auth] bootstrap firestore operation failed", {
    ...summary,
    error: input.error,
  });
}

function buildResolutionSourcePaths(uid: string, hasAccountResolution: boolean): string[] {
  const paths = [`users/${uid}`];
  if (hasAccountResolution) {
    paths.push(`accounts/${uid}`);
  }
  return paths;
}

function buildDebugProfileResolution(input: {
  uid: string;
  rawAccountFields: LegacyAccountRawFields | null;
}): NonNullable<WurderUserProfile["debugProfileResolution"]> {
  return {
    rawAccountFields: input.rawAccountFields,
    sourcePaths: buildResolutionSourcePaths(input.uid, Boolean(input.rawAccountFields)),
    snapshotAt: new Date().toISOString(),
  };
}

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

function normalizeAppAccountProfile(data: DocumentData): AppAccountProfileResolution {
  const source = data as Record<string, unknown>;
  const canonical = resolveCanonicalAccountProfile(source);

  return {
    profile: canonical,
    rawFields: {
      firstName: cleanText(typeof source.firstName === "string" ? source.firstName : undefined),
      lastName: cleanText(typeof source.lastName === "string" ? source.lastName : undefined),
      secondName: cleanText(typeof source.secondName === "string" ? source.secondName : undefined),
      username: cleanText(typeof source.username === "string" ? source.username : undefined),
      usernameLower: cleanText(typeof source.usernameLower === "string" ? source.usernameLower : undefined),
      photoURL: cleanText(typeof source.photoURL === "string" ? source.photoURL : undefined),
      avatarUrl: cleanText(typeof source.avatarUrl === "string" ? source.avatarUrl : undefined),
      avatar: cleanText(typeof source.avatar === "string" ? source.avatar : undefined),
      name: cleanText(typeof source.name === "string" ? source.name : undefined),
    },
  };
}

async function readAppAccountProfile(
  uid: string,
  requirement: FirestoreRequirement = "required"
): Promise<AppAccountProfileResolution | null> {
  const path = `accounts/${uid}`;
  try {
    logBootstrapFirestoreOperation({
      stage: "loadAccountProfile",
      op: "getDoc",
      path,
      uid,
      requirement,
      status: "start",
    });
    const accountRef = doc(db, "accounts", uid);
    const snapshot = await getDoc(accountRef);
    logBootstrapFirestoreOperation({
      stage: "loadAccountProfile",
      op: "getDoc",
      path,
      uid,
      requirement,
      status: "success",
    });
    if (!snapshot.exists()) return null;
    return normalizeAppAccountProfile(snapshot.data());
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "getDoc",
      path,
      stage: "loadAccountProfile",
      uid,
      requirement,
    });
    if (requirement === "optional") return null;
    throw error;
  }
}

async function ensureAccountDoc(
  user: User,
  seed: EnsureProfileInput
): Promise<{ accountProfile: AppAccountProfile | null; rawAccountFields: LegacyAccountRawFields | null }> {
  const uid = user.uid;
  const accountRef = doc(db, "accounts", uid);
  let accountSnapshot;
  try {
    logBootstrapFirestoreOperation({
      stage: "ensureAccountDoc.readAccount",
      op: "getDoc",
      path: `accounts/${uid}`,
      uid,
      requirement: "required",
      status: "start",
    });
    accountSnapshot = await getDoc(accountRef);
    logBootstrapFirestoreOperation({
      stage: "ensureAccountDoc.readAccount",
      op: "getDoc",
      path: `accounts/${uid}`,
      uid,
      requirement: "required",
      status: "success",
    });
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "getDoc",
      path: `accounts/${uid}`,
      stage: "ensureAccountDoc.readAccount",
      uid,
      requirement: "required",
    });
    throw error;
  }

  if (accountSnapshot.exists()) {
    const existing = normalizeAppAccountProfile(accountSnapshot.data());
    return {
      accountProfile: existing.profile,
      rawAccountFields: existing.rawFields,
    };
  }

  const firstName = cleanName(seed.firstName);
  const lastName = cleanName(seed.lastName);
  const name = cleanName(seed.name) ?? cleanName(user.displayName) ?? cleanName(buildName(firstName, lastName));
  const avatarUrl = cleanText(seed.avatar ?? undefined) ?? cleanText(user.photoURL ?? undefined) ?? null;
  const requestedWurderId = cleanText(seed.wurderId);
  const requestedWurderIdLower = requestedWurderId ? normalizeWurderId(requestedWurderId) : undefined;

  const payload = withoutUndefined({
    uid,
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    secondName: lastName ?? "",
    name,
    username: requestedWurderId,
    usernameLower: requestedWurderIdLower,
    wurderId: requestedWurderId,
    wurderIdLower: requestedWurderIdLower,
    avatar: avatarUrl,
    avatarUrl,
    photoURL: avatarUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    logBootstrapFirestoreOperation({
      stage: "ensureAccountDoc.createAccount",
      op: "setDoc",
      path: `accounts/${uid}`,
      uid,
      requirement: "required",
      status: "start",
    });
    await setDoc(accountRef, payload, { merge: false });
    logBootstrapFirestoreOperation({
      stage: "ensureAccountDoc.createAccount",
      op: "setDoc",
      path: `accounts/${uid}`,
      uid,
      requirement: "required",
      status: "success",
    });
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "setDoc",
      path: `accounts/${uid}`,
      stage: "ensureAccountDoc.createAccount",
      uid,
      requirement: "required",
    });
    throw error;
  }

  const resolution = normalizeAppAccountProfile(payload);
  return {
    accountProfile: resolution.profile,
    rawAccountFields: resolution.rawFields,
  };
}

function mergeProfiles(
  uid: string,
  userProfile: WurderUserProfile | null,
  accountProfile: AppAccountProfile | null
): WurderUserProfile | null {
  if (!userProfile && !accountProfile) return null;

  const merged = {
    ...withoutUndefined((userProfile ?? {}) as Record<string, unknown>),
    ...withoutUndefined((accountProfile ?? {}) as Record<string, unknown>),
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

function logProfileResolutionDiagnostics(input: {
  uid: string;
  usersProfile: WurderUserProfile | null;
  rawAccountFields: LegacyAccountRawFields | null;
  resolvedProfile: WurderUserProfile;
  authSession?: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
}): void {
  if (process.env.NODE_ENV === "production") return;

  const completion = getProfileCompletionStatus(input.resolvedProfile);
  const timestamp = new Date().toISOString();
  console.info("PROFILE_HYDRATE_PAYLOAD", {
    uid: input.uid,
    timestamp,
    usersProfile: input.usersProfile,
    rawAccountFields: input.rawAccountFields,
    ...(input.authSession ? { authSession: input.authSession } : {}),
  });
  console.info("MEMBERS_PROFILE_RESOLUTION", {
    uid: input.uid,
    timestamp,
    rawAccountFields: input.rawAccountFields,
    resolvedProfile: input.resolvedProfile,
  });
  console.info("RESOLVED_PROFILE", { uid: input.uid, resolvedProfile: input.resolvedProfile });
  console.info("COMPLETION_CHECK", {
    uid: input.uid,
    complete: completion.complete,
    missingFields: completion.missingFields,
  });
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

  try {
    logBootstrapFirestoreOperation({
      stage: "fetchUserProfile.backfillUsers",
      op: "setDoc",
      path: `users/${uid}`,
      uid,
      requirement: "optional",
      status: "start",
    });
    await setDoc(userRef, firestoreUpdates, { merge: true });
    logBootstrapFirestoreOperation({
      stage: "fetchUserProfile.backfillUsers",
      op: "setDoc",
      path: `users/${uid}`,
      uid,
      requirement: "optional",
      status: "success",
    });
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "setDoc",
      path: `users/${uid}`,
      stage: "fetchUserProfile.backfillUsers",
      uid,
      requirement: "optional",
    });
  }
}

async function updateAccountSnapshot(
  uid: string,
  accountProfile: AppAccountProfile | null,
  resolvedProfile: WurderUserProfile
): Promise<void> {
  const accountRef = doc(db, "accounts", uid);
  const firestoreUpdates: Record<string, unknown> = {
    uid,
    updatedAt: serverTimestamp(),
  };

  if (cleanText(resolvedProfile.firstName) && cleanText(accountProfile?.firstName) !== cleanText(resolvedProfile.firstName)) {
    firestoreUpdates.firstName = resolvedProfile.firstName;
  }
  if (cleanText(resolvedProfile.lastName) && cleanText(accountProfile?.lastName) !== cleanText(resolvedProfile.lastName)) {
    firestoreUpdates.lastName = resolvedProfile.lastName;
    firestoreUpdates.secondName = resolvedProfile.lastName;
  }
  if (cleanText(resolvedProfile.name) && cleanText(accountProfile?.name) !== cleanText(resolvedProfile.name)) {
    firestoreUpdates.name = resolvedProfile.name;
  }
  if (cleanText(resolvedProfile.wurderId) && cleanText(accountProfile?.wurderId) !== cleanText(resolvedProfile.wurderId)) {
    const lower =
      cleanText(resolvedProfile.wurderIdLower) ??
      (resolvedProfile.wurderId ? normalizeWurderId(resolvedProfile.wurderId) : undefined);
    firestoreUpdates.wurderId = resolvedProfile.wurderId;
    firestoreUpdates.wurderIdLower = lower;
    firestoreUpdates.username = resolvedProfile.wurderId;
    firestoreUpdates.usernameLower = lower;
  }
  if (resolvedProfile.avatarUrl && accountProfile?.avatarUrl !== resolvedProfile.avatarUrl) {
    firestoreUpdates.avatarUrl = resolvedProfile.avatarUrl;
    firestoreUpdates.avatar = resolvedProfile.avatarUrl;
    firestoreUpdates.photoURL = resolvedProfile.avatarUrl;
  }

  if (Object.keys(firestoreUpdates).length <= 2) return;

  try {
    logBootstrapFirestoreOperation({
      stage: "updateAccountSnapshot.writeAccount",
      op: "setDoc",
      path: `accounts/${uid}`,
      uid,
      requirement: "optional",
      status: "start",
    });
    await setDoc(accountRef, firestoreUpdates, { merge: true });
    logBootstrapFirestoreOperation({
      stage: "updateAccountSnapshot.writeAccount",
      op: "setDoc",
      path: `accounts/${uid}`,
      uid,
      requirement: "optional",
      status: "success",
    });
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "setDoc",
      path: `accounts/${uid}`,
      stage: "updateAccountSnapshot.writeAccount",
      uid,
      requirement: "optional",
    });
  }
}

export async function fetchUserProfile(uid: string): Promise<WurderUserProfile | null> {
  const accountResolution = await readAppAccountProfile(uid, "required");
  const accountProfile = accountResolution?.profile ?? null;
  let usersProfile: WurderUserProfile | null = null;
  let userSnapshot: Awaited<ReturnType<typeof getDoc>> | undefined;

  const userRef = doc(db, "users", uid);
  try {
    logBootstrapFirestoreOperation({
      stage: "fetchUserProfile.readUser",
      op: "getDoc",
      path: `users/${uid}`,
      uid,
      requirement: "optional",
      status: "start",
    });
    userSnapshot = await getDoc(userRef);
    logBootstrapFirestoreOperation({
      stage: "fetchUserProfile.readUser",
      op: "getDoc",
      path: `users/${uid}`,
      uid,
      requirement: "optional",
      status: "success",
    });
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "getDoc",
      path: `users/${uid}`,
      stage: "fetchUserProfile.readUser",
      uid,
      requirement: "optional",
    });
    usersProfile = null;
  }
  if (typeof userSnapshot !== "undefined") {
    usersProfile = userSnapshot.exists() ? normalizeProfile(uid, userSnapshot.data(), null) : null;
  }
  const profile = mergeProfiles(uid, usersProfile, accountProfile);

  if (!profile) return null;

  if (hasAnyIdentityValue(usersProfile) && !hasRequiredIdentityFields(usersProfile) && hasRequiredIdentityFields(profile)) {
    console.warn(`[auth] profile-bootstrap recovered missing canonical identity fields for uid ${uid}`);
  }

  logProfileResolutionDiagnostics({
    uid,
    usersProfile,
    rawAccountFields: accountResolution?.rawFields ?? null,
    resolvedProfile: profile,
  });

  const profileComplete = isProfileComplete(profile);

  await updateAccountSnapshot(uid, accountProfile, profile);
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
    debugProfileResolution: buildDebugProfileResolution({
      uid,
      rawAccountFields: accountResolution?.rawFields ?? null,
    }),
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

  logBootstrapFirestoreOperation({
    stage: "claimUsernameForUser.transaction",
    op: "runTransaction",
    path: `usernames/${normalized}`,
    uid: input.uid,
    requirement: "required",
    status: "start",
  });
  try {
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
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "runTransaction",
      path: `usernames/${normalized}`,
      stage: "claimUsernameForUser.transaction",
      uid: input.uid,
      requirement: "required",
    });
    throw error;
  }
  logBootstrapFirestoreOperation({
    stage: "claimUsernameForUser.transaction",
    op: "runTransaction",
    path: `usernames/${normalized}`,
    uid: input.uid,
    requirement: "required",
    status: "success",
  });

  return normalized;
}

export async function ensureUserProfile(
  user: User,
  seed: EnsureProfileInput = {}
): Promise<WurderUserProfile> {
  const uid = user.uid;
  const accountResolution = await ensureAccountDoc(user, seed);
  const accountProfile = accountResolution.accountProfile;

  const email = user.email ? normalizeEmail(user.email) : null;
  let usersProfile: WurderUserProfile | null = null;
  const userRef = doc(db, "users", uid);
  try {
    logBootstrapFirestoreOperation({
      stage: "ensureUserProfile.readUser",
      op: "getDoc",
      path: `users/${uid}`,
      uid,
      requirement: "optional",
      status: "start",
    });
    const snapshot = await getDoc(userRef);
    logBootstrapFirestoreOperation({
      stage: "ensureUserProfile.readUser",
      op: "getDoc",
      path: `users/${uid}`,
      uid,
      requirement: "optional",
      status: "success",
    });
    usersProfile = snapshot.exists() ? normalizeProfile(uid, snapshot.data(), email) : null;
  } catch (error) {
    logBootstrapFirestoreFailure({
      error,
      op: "getDoc",
      path: `users/${uid}`,
      stage: "ensureUserProfile.readUser",
      uid,
      requirement: "optional",
    });
  }

  const resolved = mergeProfiles(uid, usersProfile, accountProfile) ?? {
    uid,
    email,
    stats: { ...DEFAULT_PROFILE_STATS },
  };
  const profileComplete = isProfileComplete(resolved);

  const nextProfile: WurderUserProfile = {
    ...resolved,
    onboarding: {
      ...(resolved.onboarding ?? {}),
      profileComplete,
    },
    debugProfileResolution: buildDebugProfileResolution({
      uid,
      rawAccountFields: accountResolution.rawAccountFields,
    }),
  };

  logProfileResolutionDiagnostics({
    uid,
    usersProfile,
    rawAccountFields: accountResolution.rawAccountFields,
    resolvedProfile: nextProfile,
    authSession: {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoURL: user.photoURL ?? null,
    },
  });

  await updateAccountSnapshot(uid, accountProfile, nextProfile);
  await backfillUsersFromMergedProfile(uid, usersProfile, nextProfile, accountProfile);

  return nextProfile;
}

export async function updateUserProfile(
  uid: string,
  input: UpdateUserProfileInput
): Promise<WurderUserProfile> {
  const accountRef = doc(db, "accounts", uid);
  const accountSnapshot = await getDoc(accountRef);
  if (!accountSnapshot.exists()) {
    throw new Error("Profile not found.");
  }

  const accountResolution = normalizeAppAccountProfile(accountSnapshot.data());
  const currentProfile = mergeProfiles(uid, null, accountResolution.profile) as WurderUserProfile;

  const accountUpdates: Record<string, unknown> = {
    uid,
    updatedAt: serverTimestamp(),
  };
  const memoryUpdates: Partial<WurderUserProfile> = {};

  if ("firstName" in input) {
    const firstName = cleanName(input.firstName);
    if (firstName) {
      accountUpdates.firstName = firstName;
      memoryUpdates.firstName = firstName;
    } else if (cleanText(currentProfile.firstName)) {
      console.warn(`[auth] Ignored empty firstName update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("lastName" in input) {
    const lastName = cleanName(input.lastName);
    if (lastName) {
      accountUpdates.lastName = lastName;
      accountUpdates.secondName = lastName;
      memoryUpdates.lastName = lastName;
    } else if (cleanText(currentProfile.lastName)) {
      console.warn(`[auth] Ignored empty lastName update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("name" in input) {
    const name = cleanName(input.name);
    if (name) {
      accountUpdates.name = name;
      memoryUpdates.name = name;
    } else if (cleanText(currentProfile.name)) {
      console.warn(`[auth] Ignored empty name update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("avatar" in input) {
    const avatar = cleanText(input.avatar ?? undefined);
    if (avatar) {
      accountUpdates.avatar = avatar;
      memoryUpdates.avatar = avatar;
    } else if (currentProfile.avatar) {
      console.warn(`[auth] Ignored empty avatar update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("avatarUrl" in input) {
    const avatarUrl = cleanText(input.avatarUrl ?? undefined);
    if (avatarUrl) {
      accountUpdates.avatar = avatarUrl;
      accountUpdates.avatarUrl = avatarUrl;
      accountUpdates.photoURL = avatarUrl;
      memoryUpdates.avatarUrl = avatarUrl;
    } else if (currentProfile.avatarUrl) {
      console.warn(`[auth] Ignored empty avatarUrl update for uid ${uid} to preserve canonical profile data`);
    }
  }

  if ("wurderId" in input && typeof input.wurderId === "string") {
    const candidateWurderId = input.wurderId.trim();
    const candidateLower = normalizeWurderId(candidateWurderId);
    const currentLower = cleanText(currentProfile.wurderIdLower) ?? cleanText(accountResolution.profile.wurderIdLower);

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
      accountUpdates.username = candidateWurderId;
      accountUpdates.usernameLower = candidateLower;
      accountUpdates.wurderId = candidateWurderId;
      accountUpdates.wurderIdLower = candidateLower;
      memoryUpdates.wurderId = candidateWurderId;
      memoryUpdates.wurderIdLower = candidateLower;
    }
  }

  const nextProfile: WurderUserProfile = {
    ...currentProfile,
    ...memoryUpdates,
  };

  const profileComplete = isProfileComplete(nextProfile);
  await setDoc(accountRef, accountUpdates, { merge: true });

  await backfillUsersFromMergedProfile(uid, null, {
    ...nextProfile,
    onboarding: { ...(nextProfile.onboarding ?? {}), profileComplete },
  }, accountResolution.profile);

  return {
    ...nextProfile,
    onboarding: {
      ...(nextProfile.onboarding ?? {}),
      profileComplete,
    },
  };
}
