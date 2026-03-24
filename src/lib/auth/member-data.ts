import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { DEFAULT_PROFILE_STATS, type WurderUserProfile } from "@/lib/types/user";

export type FetchMemberDataWarning = {
  code: "profiles-missing" | "profiles-read-failed" | "profiles-stats-fallback";
  message: string;
};

export type FetchMemberDataResult = {
  profile: WurderUserProfile | null;
  stats: typeof DEFAULT_PROFILE_STATS;
  warnings: FetchMemberDataWarning[];
  sources: {
    profile: "accounts/{uid}";
    stats: "profiles/{uid}" | "fallback-none";
  };
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readStat(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = asNumber(source[key]);
    if (value != null) return value;
  }
  return 0;
}

function normalizeStats(data: Record<string, unknown>): typeof DEFAULT_PROFILE_STATS {
  const lifetimePoints = readStat(data, ["lifetimePoints", "pointsLifetime", "totalPoints", "lifetimeScore"]);
  const points = readStat(data, ["points", "lifetimePoints", "pointsLifetime", "totalPoints", "lifetimeScore"]);

  return {
    gamesPlayed: readStat(data, ["gamesPlayed", "sessions", "sessionCount"]),
    wins: readStat(data, ["wins", "lifetimeWins"]),
    kills: readStat(data, ["kills", "lifetimeKills"]),
    deaths: readStat(data, ["deaths", "lifetimeDeaths", "lifetimeCaught", "lifetimeDefeats"]),
    streak: readStat(data, ["streak", "bestStreak", "streakBest"]),
    points,
    pointsLifetime: lifetimePoints || points,
    mvpAwards: readStat(data, ["mvpAwards", "lifetimeMvpAwards", "mvps"]),
  };
}

function buildWarnings(kind: "missing" | "read-failed"): FetchMemberDataWarning[] {
  if (kind === "missing") {
    return [
      { code: "profiles-missing", message: "Gameplay stats document missing at profiles/{uid}; using zero fallback values." },
      { code: "profiles-stats-fallback", message: "Using fallback gameplay stats." },
    ];
  }
  return [
    { code: "profiles-read-failed", message: "Gameplay stats read failed at profiles/{uid}; using zero fallback values." },
    { code: "profiles-stats-fallback", message: "Using fallback gameplay stats." },
  ];
}

export async function fetchMemberData(uid: string): Promise<FetchMemberDataResult> {
  const usersRef = doc(db, "users", uid);
  const accountsRef = doc(db, "accounts", uid);
  const profilesRef = doc(db, "profiles", uid);

  const [usersSnap, accountsSnap] = await Promise.all([getDoc(usersRef), getDoc(accountsRef)]);
  const usersData = (usersSnap.exists() ? usersSnap.data() : {}) as Record<string, unknown>;
  const accountsData = (accountsSnap.exists() ? accountsSnap.data() : {}) as Record<string, unknown>;

  const firstName = asString(accountsData.firstName) ?? asString(usersData.firstName);
  const lastName = asString(accountsData.lastName) ?? asString(accountsData.secondName) ?? asString(usersData.lastName);
  const explicitName = asString(accountsData.name) ?? asString(usersData.name);
  const fallbackName = [firstName, lastName].filter(Boolean).join(" ");
  const name = explicitName ?? (fallbackName || null);
  const wurderId = asString(accountsData.username) ?? asString(accountsData.wurderId) ?? asString(usersData.wurderId);
  const avatarUrl =
    asString(accountsData.photoURL) ??
    asString(accountsData.avatarUrl) ??
    asString(accountsData.avatar) ??
    asString(usersData.avatarUrl) ??
    asString(usersData.avatar);
  const email = asString(usersData.email);

  await setDoc(usersRef, {
    uid,
    email,
    firstName,
    lastName,
    name,
    wurderId,
    wurderIdLower: wurderId?.toLowerCase() ?? null,
    avatarUrl,
    avatar: avatarUrl,
    updatedAt: "ts",
  });

  let stats = { ...DEFAULT_PROFILE_STATS };
  let warnings: FetchMemberDataWarning[] = [];
  let statsSource: "profiles/{uid}" | "fallback-none" = "fallback-none";

  try {
    const profilesSnap = await getDoc(profilesRef);
    if (profilesSnap.exists()) {
      stats = normalizeStats((profilesSnap.data() ?? {}) as Record<string, unknown>);
      statsSource = "profiles/{uid}";
    } else {
      warnings = buildWarnings("missing");
    }
  } catch {
    warnings = buildWarnings("read-failed");
  }

  return {
    profile: {
      uid,
      email,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      name: name ?? undefined,
      wurderId: wurderId ?? undefined,
      wurderIdLower: wurderId?.toLowerCase() ?? undefined,
      avatarUrl: avatarUrl ?? null,
      avatar: avatarUrl ?? null,
      stats,
    },
    stats,
    warnings,
    sources: {
      profile: "accounts/{uid}",
      stats: statsSource,
    },
  };
}
