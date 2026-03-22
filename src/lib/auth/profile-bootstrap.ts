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
import { resolveLifetimeDefeatsFromProfile } from "@/lib/analytics/player-metrics";
import { isProfileComplete } from "@/lib/auth/profile-completion";
import { DEFAULT_PROFILE_STATS, type UsernameLookup, type WurderUserProfile } from "@/lib/types/user";

type NormalizedUserStats = typeof DEFAULT_PROFILE_STATS;

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

type MemberDataWarningCode =
  | "accounts-read-failed"
  | "accounts-missing"
  | "profiles-read-failed"
  | "profiles-missing"
  | "profiles-stats-fallback";

export type MemberDataWarning = {
  code: MemberDataWarningCode;
  message: string;
};

export type MemberDataSources = {
  profile: "accounts/{uid}" | "users/{uid}-fallback" | "fallback-none";
  stats: "profiles/{uid}" | "fallback-none";
};

export type MemberDataSnapshot = {
  profile: WurderUserProfile | null;
  stats: NormalizedUserStats;
  warnings: MemberDataWarning[];
  sources: MemberDataSources;
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

function normalizeStats(stats: unknown): NormalizedUserStats {
  if (!stats || typeof stats !== "object") {
    return { ...DEFAULT_PROFILE_STATS };
  }
  return {
    ...DEFAULT_PROFILE_STATS,
    ...(stats as Record<string, number>),
  };
}

function mapProfilesStats(data: DocumentData): NormalizedUserStats {
  const source = data as Record<string, unknown>;
  const gamesPlayed = typeof source.gamesPlayed === "number" ? source.gamesPlayed : undefined;
  const kills = typeof source.lifetimeKills === "number" ? source.lifetimeKills : undefined;
  const wins = typeof source.lifetimeWins === "number" ? source.lifetimeWins : undefined;
  const streak = typeof source.bestStreak === "number" ? source.bestStreak : undefined;
  const lifetimePoints = typeof source.lifetimePoints === "number" ? source.lifetimePoints : undefined;
  const defeats = resolveLifetimeDefeatsFromProfile(source);
  const mvpAwards =
    typeof source.mvpAwards === "number"
      ? source.mvpAwards
      : typeof source.lifetimeMvpAwards === "number"
        ? source.lifetimeMvpAwards
        : undefined;

  return normalizeStats(withoutUndefined({
    gamesPlayed,
    kills,
    wins,
    deaths: defeats,
    streak,
    points: lifetimePoints,
    pointsLifetime: lifetimePoints,
    mvpAwards,
  }));
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

function needsAccountFallback(profile: Partial<WurderUserProfile> | null): boolean {
  if (!profile) return true;
  return !hasRequiredIdentityFields(profile);
}

function normalizeAppAccountProfile(data: DocumentData): AppAccountProfile {
  const source = data as Record<string, unknown>;
  const firstName = cleanName(typeof source.firstName === "string" ? source.firstName : undefined);
  const lastName = cleanName(typeof source.secondName === "string" ? source.secondName : undefined);
  const wurderId = cleanText(typeof source.username === "string" ? source.username : undefined);
  const avatarUrl = cleanText(typeof source.photoURL === "string" ? source.photoURL : undefined) ?? null;

  return {
    firstName,
    lastName,
    name: cleanName(typeof source.name === "string" ? source.name : undefined) ?? cleanName(buildName(firstName, lastName)),
    wurderId,
    wurderIdLower: wurderId ? normalizeWurderId(wurderId) : undefined,
    avatar: avatarUrl,
    avatarUrl,
  };
}

async function readAppAccountProfile(uid: string): Promise<AppAccountProfile | null> {
  const accountSnapshot = await getDoc(doc(db, "accounts", uid));
  return accountSnapshot.exists() ? normalizeAppAccountProfile(accountSnapshot.data()) : null;
}

async function readProfileStats(uid: string): Promise<{
  stats: NormalizedUserStats;
  source: MemberDataSources["stats"];
  warnings: MemberDataWarning[];
}> {
  // Guardrail: gameplay aggregates are sourced from profiles/{uid} only.
  // Do not read gameplay stats from accounts/{uid} or write them into users/{uid} here.
  try {
    const snapshot = await getDoc(doc(db, "profiles", uid));
    if (!snapshot.exists()) {
      return {
        stats: { ...DEFAULT_PROFILE_STATS },
        source: "fallback-none",
        warnings: [
          {
            code: "profiles-missing",
            message: `No profiles/${uid} stats document found. Falling back to zero stats.`,
          },
          {
            code: "profiles-stats-fallback",
            message: "Stats fallback to defaults because profiles/{uid} is missing.",
          },
        ],
      };
    }

    return {
      stats: mapProfilesStats(snapshot.data()),
      source: "profiles/{uid}",
      warnings: [],
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auth] Failed to read profile stats from profiles/${uid}`, error);
    }
    return {
      stats: { ...DEFAULT_PROFILE_STATS },
      source: "fallback-none",
      warnings: [
        {
          code: "profiles-read-failed",
          message: `profiles/${uid} could not be read. Falling back to zero stats.`,
        },
        {
          code: "profiles-stats-fallback",
          message: "Stats fallback to defaults because profiles/{uid} read failed.",
        },
      ],
    };
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
    firestoreUpdates.activeGame = mergedProfile.activeGame ?? null;
  }

  if (!cleanText(usersProfile?.firstName) && cleanText(mergedProfile.firstName)) {
    firestoreUpdates.firstName = mergedProfile.firstName;
  }
  if (!cleanText(usersProfile?.lastName) && cleanText(mergedProfile.lastName)) {
    firestoreUpdates.lastName = mergedProfile.lastName;
  }
  if (!cleanText(usersProfile?.name) && cleanText(mergedProfile.name)) {
    firestoreUpdates.name = mergedProfile.name;
  }
  if (!cleanText(usersProfile?.wurderId) && cleanText(mergedProfile.wurderId)) {
    firestoreUpdates.wurderId = mergedProfile.wurderId;
    firestoreUpdates.wurderIdLower =
      cleanText(mergedProfile.wurderIdLower) ?? normalizeWurderId(mergedProfile.wurderId ?? "");
  }
  if (!usersProfile?.avatarUrl && mergedProfile.avatarUrl) {
    firestoreUpdates.avatarUrl = mergedProfile.avatarUrl;
  }
  if (!usersProfile?.avatar && mergedProfile.avatar) {
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

export async function fetchMemberData(uid: string): Promise<MemberDataSnapshot> {
  const warnings: MemberDataWarning[] = [];
  let usersProfile: WurderUserProfile | null = null;

  try {
    const userSnapshot = await getDoc(doc(db, "users", uid));
    usersProfile = userSnapshot.exists() ? normalizeProfile(uid, userSnapshot.data(), null) : null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auth] Failed to read users/${uid} profile`, error);
    }
  }

  const profileStatsResult = await readProfileStats(uid);
  warnings.push(...profileStatsResult.warnings);

  let accountProfile: AppAccountProfile | null = null;
  let profileSource: MemberDataSources["profile"] = "fallback-none";
  try {
    accountProfile = await readAppAccountProfile(uid);
    if (accountProfile) {
      profileSource = "accounts/{uid}";
    } else if (usersProfile) {
      profileSource = "users/{uid}-fallback";
      warnings.push({
        code: "accounts-missing",
        message: `No accounts/${uid} identity document found. Falling back to users/${uid}.`,
      });
    }
  } catch (error) {
    profileSource = usersProfile ? "users/{uid}-fallback" : "fallback-none";
    warnings.push({
      code: "accounts-read-failed",
      message: `accounts/${uid} could not be read. Falling back to users/${uid}.`,
    });
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auth] Failed to read identity from accounts/${uid}`, error);
    }
  }

  const mergedProfile = mergeProfiles(uid, usersProfile, accountProfile);
  if (!mergedProfile) {
    return {
      profile: null,
      stats: profileStatsResult.stats,
      warnings,
      sources: {
        profile: "fallback-none",
        stats: profileStatsResult.source,
      },
    };
  }

  const profile: WurderUserProfile = {
    ...mergedProfile,
    stats: profileStatsResult.stats,
  };
  const profileComplete = isProfileComplete(profile);

  await backfillUsersFromMergedProfile(uid, usersProfile, profile, accountProfile);

  return {
    profile: {
      ...profile,
      onboarding: {
        ...(profile.onboarding ?? {}),
        profileComplete:
          typeof profile.onboarding?.profileComplete === "boolean"
            ? profile.onboarding.profileComplete
            : profileComplete,
      },
    },
    stats: profileStatsResult.stats,
    warnings,
    sources: {
      profile: profileSource,
      stats: profileStatsResult.source,
    },
  };
}

export async function fetchUserProfile(uid: string): Promise<WurderUserProfile | null> {
  const data = await fetchMemberData(uid);
  if (process.env.NODE_ENV !== "production" && data.warnings.length > 0) {
    console.warn(
      `[auth] Member data warnings for uid ${uid}`,
      data.warnings.map((warning) => warning.code)
    );
  }
  return data.profile;
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

      if (!existingEmail && normalizedEmail) {
        transaction.set(
          lookupRef,
          {
            email: normalizedEmail,
          },
          { merge: true }
        );
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
  let accountProfile: AppAccountProfile | null = null;
  if (
    needsAccountFallback(
      snapshot.exists()
        ? normalizeProfile(uid, snapshot.data(), user.email ? normalizeEmail(user.email) : null)
        : null
    )
  ) {
    try {
      accountProfile = await readAppAccountProfile(uid);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[auth] Failed to read fallback account profile for uid ${uid}`, error);
      }
      accountProfile = null;
    }
  }

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
  const existingWurderId = cleanText(currentProfile.wurderId) ?? cleanText(mergedCurrentProfile.wurderId);

  if (existingWurderId && email) {
    try {
      await claimUsernameForUser({
        uid,
        email,
        wurderId: existingWurderId,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[auth] Failed to repair username lookup for uid ${uid}`, error);
      }
    }
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

  if (!cleanText(currentProfile.name) && cleanText(mergedCurrentProfile.name)) {
    firestoreUpdates.name = mergedCurrentProfile.name;
    memoryUpdates.name = mergedCurrentProfile.name;
  }

  if (!cleanText(currentProfile.firstName) && cleanText(mergedCurrentProfile.firstName)) {
    firestoreUpdates.firstName = mergedCurrentProfile.firstName;
    memoryUpdates.firstName = mergedCurrentProfile.firstName;
  }

  if (!cleanText(currentProfile.lastName) && cleanText(mergedCurrentProfile.lastName)) {
    firestoreUpdates.lastName = mergedCurrentProfile.lastName;
    memoryUpdates.lastName = mergedCurrentProfile.lastName;
  }

  if (!currentProfile.avatar && mergedCurrentProfile.avatar) {
    firestoreUpdates.avatar = mergedCurrentProfile.avatar;
    memoryUpdates.avatar = mergedCurrentProfile.avatar;
  }

  if (!currentProfile.avatarUrl && mergedCurrentProfile.avatarUrl) {
    firestoreUpdates.avatarUrl = mergedCurrentProfile.avatarUrl;
    memoryUpdates.avatarUrl = mergedCurrentProfile.avatarUrl;
  }

  if (!cleanText(currentProfile.wurderId) && cleanText(mergedCurrentProfile.wurderId)) {
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
    const firstName = cleanName(input.firstName) ?? "";
    firestoreUpdates.firstName = firstName;
    memoryUpdates.firstName = firstName;
  }

  if ("lastName" in input) {
    const lastName = cleanName(input.lastName) ?? "";
    firestoreUpdates.lastName = lastName;
    memoryUpdates.lastName = lastName;
  }

  if ("name" in input) {
    const name = cleanName(input.name) ?? "";
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
