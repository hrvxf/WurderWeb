import { doc, getDoc, type DocumentData } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { WurderUserProfile } from "@/lib/types/user";

export type MemberStatsSummary = {
  gamesPlayed: number;
  wins: number;
  kills: number;
  deaths: number;
  bestStreak: number;
  points: number;
  lifetimePoints: number;
  mvpAwards: number;
};

export type MemberDataWarning = {
  code: "stats-missing" | "stats-unreadable";
  message: string;
};

export type MemberDataSources = {
  profile: "accounts/{uid}";
  stats: "profiles/{uid}" | "users/{uid}" | "fallback-none";
};

export type MemberDataResult = {
  profile: WurderUserProfile | null;
  stats: MemberStatsSummary;
  achievementIds: string[];
  warnings: MemberDataWarning[];
  sources: MemberDataSources;
};

export const DEFAULT_MEMBER_STATS: MemberStatsSummary = {
  gamesPlayed: 0,
  wins: 0,
  kills: 0,
  deaths: 0,
  bestStreak: 0,
  points: 0,
  lifetimePoints: 0,
  mvpAwards: 0,
};

function readStringArray(source: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = key.includes(".") ? readPathValue(source, key) : source[key];
    if (!Array.isArray(value)) continue;
    const normalized = value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

function readNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function readPathValue(source: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function readNumberOrCollectionCount(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = key.includes(".") ? readPathValue(source, key) : source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (Object.keys(obj).length > 0 && Object.values(obj).every((entry) => typeof entry === "boolean")) {
        return Object.values(obj).filter(Boolean).length;
      }
    }
  }
  return 0;
}

function normalizeStats(data: DocumentData): MemberStatsSummary {
  const source = (data ?? {}) as Record<string, unknown>;
  const nestedStats =
    source.stats && typeof source.stats === "object" ? (source.stats as Record<string, unknown>) : null;
  const merged = nestedStats ? { ...source, ...nestedStats } : source;
  const lifetimePoints = readNumber(merged, ["lifetimePoints", "pointsLifetime", "totalPoints"]);
  const explicitPoints = readNumber(merged, ["points"]);

  return {
    gamesPlayed: readNumber(merged, ["gamesPlayed", "lifetimeGames", "totalGames", "games"]),
    wins: readNumber(merged, ["lifetimeWins", "wins", "winCount", "totalWins"]),
    kills: readNumber(merged, ["lifetimeKills", "kills", "killCount", "totalKills"]),
    deaths: readNumber(merged, [
      "lifetimeCaught",
      "caughtLifetime",
      "caught",
      "totalCaught",
      "timesCaught",
      "lifetimeDefeats",
      "defeatsLifetime",
      "defeats",
      "totalDefeats",
      "lifetimeDeaths",
      "deaths",
      "totalDeaths",
    ]),
    bestStreak: readNumber(merged, ["bestStreak", "streakBest", "streak"]),
    points: explicitPoints || lifetimePoints,
    lifetimePoints,
    mvpAwards: readNumberOrCollectionCount(merged, [
      "achievementIds",
      "achievements.achievementIds",
      "awards.achievementIds",
      "mvpAwards",
      "lifetimeMvpAwards",
      "mvps",
      "mvpCount",
      "lifetimeMvp",
      "awards.mvp",
      "awards.mvpAwards",
      "awards.mvps",
      "achievements.mvp",
      "achievements.mvpAwards",
      "achievements.mvpCount",
      "achievements.mvps",
      "achievements.awards.mvp",
      "achievements.awards.mvpAwards",
      "mvpHistory",
    ]),
  };
}

function hasAnyStats(stats: MemberStatsSummary): boolean {
  return (
    stats.gamesPlayed > 0 ||
    stats.wins > 0 ||
    stats.kills > 0 ||
    stats.deaths > 0 ||
    stats.bestStreak > 0 ||
    stats.points > 0 ||
    stats.lifetimePoints > 0 ||
    stats.mvpAwards > 0
  );
}

async function readLegacyStatsFromUsers(uid: string): Promise<MemberStatsSummary | null> {
  try {
    const usersRef = doc(db, "users", uid);
    const snapshot = await getDoc(usersRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Record<string, unknown>;
    const rawStats =
      data.stats && typeof data.stats === "object"
        ? (data.stats as DocumentData)
        : (data as DocumentData);
    const normalized = normalizeStats(rawStats);
    return hasAnyStats(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function shouldLogDiagnostics(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_ENABLE_BOOTSTRAP_FIRESTORE_DIAGNOSTICS === "true";
}

export async function fetchMemberStatsSummary(uid: string): Promise<{
  stats: MemberStatsSummary;
  achievementIds: string[];
  warnings: MemberDataWarning[];
  source: MemberDataSources["stats"];
}> {
  const path = `profiles/${uid}`;
  try {
    const profileRef = doc(db, "profiles", uid);
    const snapshot = await getDoc(profileRef);

    if (!snapshot.exists()) {
      const usersFallback = await readLegacyStatsFromUsers(uid);
      if (usersFallback) {
        const warning: MemberDataWarning = {
          code: "stats-missing",
          message: `Gameplay stats missing at ${path}; loaded fallback stats from users/{uid}.`,
        };
        console.warn("[members] stats fallback to users/{uid}", { uid, path });
        return {
          stats: usersFallback,
          achievementIds: [],
          warnings: [warning],
          source: "users/{uid}",
        };
      }
      const warning: MemberDataWarning = {
        code: "stats-missing",
        message: `Gameplay stats document missing at ${path}; using zero fallback values.`,
      };
      console.warn("[members] stats document missing", { uid, path });
      return {
        stats: { ...DEFAULT_MEMBER_STATS },
        achievementIds: [],
        warnings: [warning],
        source: "fallback-none",
      };
    }

    const rawData = snapshot.data() as Record<string, unknown>;
    const stats = normalizeStats(rawData);
    const nestedStats =
      rawData.stats && typeof rawData.stats === "object" ? (rawData.stats as Record<string, unknown>) : null;
    const merged = nestedStats ? { ...rawData, ...nestedStats } : rawData;
    const achievementIds = readStringArray(merged, [
      "achievementIds",
      "achievements.achievementIds",
      "awards.achievementIds",
    ]);

    if (shouldLogDiagnostics()) {
      console.info("MEMBERS_STATS_SOURCE", {
        uid,
        statsPath: path,
        source: "profiles/{uid}",
        stats,
      });
    }

    return {
      stats,
      achievementIds,
      warnings: [],
      source: "profiles/{uid}",
    };
  } catch (error) {
    const usersFallback = await readLegacyStatsFromUsers(uid);
    if (usersFallback) {
      const warning: MemberDataWarning = {
        code: "stats-unreadable",
        message: `Gameplay stats read failed at ${path}; loaded fallback stats from users/{uid}.`,
      };
      console.warn("[members] stats fallback to users/{uid} after profile read failure", { uid, path, error });
      return {
        stats: usersFallback,
        achievementIds: [],
        warnings: [warning],
        source: "users/{uid}",
      };
    }
    const warning: MemberDataWarning = {
      code: "stats-unreadable",
      message: `Gameplay stats read failed at ${path}; using zero fallback values.`,
    };
    console.warn("[members] failed to load gameplay stats", { uid, path, error });
    return {
      stats: { ...DEFAULT_MEMBER_STATS },
      achievementIds: [],
      warnings: [warning],
      source: "fallback-none",
    };
  }
}

export async function composeMemberData(input: {
  profile: WurderUserProfile | null;
  uid: string;
}): Promise<MemberDataResult> {
  const statsResolution = await fetchMemberStatsSummary(input.uid);
  const existingAchievements = Array.isArray(input.profile?.achievementIds)
    ? input.profile.achievementIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const achievementIds =
    existingAchievements.length > 0 ? existingAchievements : statsResolution.achievementIds;
  const profile =
    input.profile == null
      ? null
      : {
          ...input.profile,
          achievementIds,
        };

  return {
    profile,
    stats: statsResolution.stats,
    achievementIds,
    warnings: statsResolution.warnings,
    sources: {
      profile: "accounts/{uid}",
      stats: statsResolution.source,
    },
  };
}
