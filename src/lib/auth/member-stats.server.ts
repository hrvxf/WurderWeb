import "server-only";

import { type DocumentData } from "firebase-admin/firestore";

import type { MemberStatsSummary } from "@/lib/auth/member-stats";
import { adminDb } from "@/lib/firebase/admin";

type MemberStatsPageInitialData = {
  stats: MemberStatsSummary;
  achievementIds: string[];
};

const DEFAULT_MEMBER_STATS: MemberStatsSummary = {
  gamesPlayed: 0,
  wins: 0,
  kills: 0,
  deaths: 0,
  bestStreak: 0,
  points: 0,
  lifetimePoints: 0,
  mvpAwards: 0,
};

function readPathValue(source: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function readNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = key.includes(".") ? readPathValue(source, key) : source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
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

function readStringArray(source: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = key.includes(".") ? readPathValue(source, key) : source[key];
    if (!Array.isArray(value)) continue;
    const normalized = value
      .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
      .filter((entry) => entry.length > 0);
    if (normalized.length > 0) {
      return [...new Set(normalized)];
    }
  }
  return [];
}

function normalizeStats(data: DocumentData | undefined): MemberStatsSummary {
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

function extractAchievementIds(data: DocumentData | undefined): string[] {
  if (!data || typeof data !== "object") return [];
  return readStringArray(data as Record<string, unknown>, [
    "achievementIds",
    "achievements.achievementIds",
    "awards.achievementIds",
  ]);
}

export async function readInitialMemberStatsData(uid: string): Promise<MemberStatsPageInitialData> {
  const [usersSnap, profilesSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("profiles").doc(uid).get(),
  ]);

  const usersData = usersSnap.exists ? (usersSnap.data() as DocumentData) : undefined;
  const profilesData = profilesSnap.exists ? (profilesSnap.data() as DocumentData) : undefined;

  const profilesStats = normalizeStats(profilesData);
  const usersStats = normalizeStats(usersData);
  const stats = hasAnyStats(profilesStats)
    ? profilesStats
    : hasAnyStats(usersStats)
      ? usersStats
      : { ...DEFAULT_MEMBER_STATS };

  const usersAchievements = extractAchievementIds(usersData);
  const profilesAchievements = extractAchievementIds(profilesData);

  return {
    stats,
    achievementIds: usersAchievements.length > 0 ? usersAchievements : profilesAchievements,
  };
}

export type { MemberStatsPageInitialData };
