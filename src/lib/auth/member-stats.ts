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
  stats: "profiles/{uid}" | "fallback-none";
};

export type MemberDataResult = {
  profile: WurderUserProfile | null;
  stats: MemberStatsSummary;
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

function readNumber(source: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function normalizeStats(data: DocumentData): MemberStatsSummary {
  const source = (data ?? {}) as Record<string, unknown>;
  const lifetimePoints = readNumber(source, ["lifetimePoints", "pointsLifetime", "totalPoints"]);
  const explicitPoints = readNumber(source, ["points"]);

  return {
    gamesPlayed: readNumber(source, ["gamesPlayed"]),
    wins: readNumber(source, ["lifetimeWins", "wins"]),
    kills: readNumber(source, ["lifetimeKills", "kills"]),
    deaths: readNumber(source, ["lifetimeDeaths", "deaths", "totalDeaths"]),
    bestStreak: readNumber(source, ["bestStreak", "streakBest", "streak"]),
    points: explicitPoints || lifetimePoints,
    lifetimePoints,
    mvpAwards: readNumber(source, ["mvpAwards", "lifetimeMvpAwards", "mvps"]),
  };
}

function shouldLogDiagnostics(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.NEXT_PUBLIC_ENABLE_BOOTSTRAP_FIRESTORE_DIAGNOSTICS === "true";
}

export async function fetchMemberStatsSummary(uid: string): Promise<{
  stats: MemberStatsSummary;
  warnings: MemberDataWarning[];
  source: MemberDataSources["stats"];
}> {
  const path = `profiles/${uid}`;
  try {
    const profileRef = doc(db, "profiles", uid);
    const snapshot = await getDoc(profileRef);

    if (!snapshot.exists()) {
      const warning: MemberDataWarning = {
        code: "stats-missing",
        message: `Gameplay stats document missing at ${path}; using zero fallback values.`,
      };
      console.warn("[members] stats document missing", { uid, path });
      return {
        stats: { ...DEFAULT_MEMBER_STATS },
        warnings: [warning],
        source: "fallback-none",
      };
    }

    const stats = normalizeStats(snapshot.data());

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
      warnings: [],
      source: "profiles/{uid}",
    };
  } catch (error) {
    const warning: MemberDataWarning = {
      code: "stats-unreadable",
      message: `Gameplay stats read failed at ${path}; using zero fallback values.`,
    };
    console.warn("[members] failed to load gameplay stats", { uid, path, error });
    return {
      stats: { ...DEFAULT_MEMBER_STATS },
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

  return {
    profile: input.profile,
    stats: statsResolution.stats,
    warnings: statsResolution.warnings,
    sources: {
      profile: "accounts/{uid}",
      stats: statsResolution.source,
    },
  };
}
