import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser, CurrentUserInfrastructureError, CurrentUserUnauthenticatedError } from "@/lib/auth/getCurrentUser";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type Timeframe = "7d" | "30d" | "90d" | "all";

type UserGameDoc = {
  gameCode?: unknown;
  gameId?: unknown;
  createdAt?: unknown;
  joinedAt?: unknown;
};

type GameDoc = {
  mode?: unknown;
  createdAt?: unknown;
  endedAt?: unknown;
  winnerUid?: unknown;
  winningPlayerId?: unknown;
};

type TrendPoint = {
  gameCode: string;
  mode: string | null;
  occurredAt: string | null;
  kills: number;
  deaths: number;
  won: boolean;
  points: number;
  mvpAwards: number;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return null;
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const ts = value as Timestamp;
    const date = ts.toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function normalizeMode(value: unknown): string | null {
  const mode = asNonEmptyString(value);
  return mode ? mode.toLowerCase() : null;
}

function readGameCode(data: UserGameDoc, docId: string): string | null {
  return asNonEmptyString(data.gameCode) ?? asNonEmptyString(data.gameId) ?? asNonEmptyString(docId);
}

function sinceForTimeframe(timeframe: Timeframe): number | null {
  const now = Date.now();
  if (timeframe === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (timeframe === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  if (timeframe === "90d") return now - 90 * 24 * 60 * 60 * 1000;
  return null;
}

function sumEventCounts(value: unknown, keys: string[]): number {
  if (!value || typeof value !== "object") return 0;
  const counts = value as Record<string, unknown>;
  return keys.reduce((sum, key) => sum + (asNumber(counts[key]) ?? 0), 0);
}

function readMvpCount(data: Record<string, unknown>): number {
  const direct =
    asNumber(data.mvpAwards) ??
    asNumber(data.lifetimeMvpAwards) ??
    asNumber(data.mvps) ??
    asNumber(data.mvpCount);
  if (direct != null) return direct;
  const achievementIds = data.achievementIds;
  if (Array.isArray(achievementIds)) return achievementIds.length;
  return 0;
}

async function findPlayerAnalyticsForGame(gameCode: string, uid: string): Promise<Record<string, unknown> | null> {
  const collection = adminDb.collection("playerAnalytics");
  const exactQueries: Array<Promise<FirebaseFirestore.QuerySnapshot>> = [
    collection.where("gameCode", "==", gameCode).where("playerId", "==", uid).limit(1).get(),
    collection.where("gameCode", "==", gameCode).where("userId", "==", uid).limit(1).get(),
    collection.where("gameCode", "==", gameCode).where("uid", "==", uid).limit(1).get(),
  ];
  for (const query of exactQueries) {
    try {
      const snap = await query;
      if (!snap.empty) return (snap.docs[0]?.data() ?? {}) as Record<string, unknown>;
    } catch {
      // Fallback scan below handles index incompatibility.
    }
  }

  const fallback = await collection.where("gameCode", "==", gameCode).limit(120).get();
  for (const doc of fallback.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const candidateId = asNonEmptyString(data.playerId) ?? asNonEmptyString(data.userId) ?? asNonEmptyString(data.uid);
    if (candidateId === uid) return data;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const { uid } = await getCurrentUser(request.headers.get("authorization"));
    const url = new URL(request.url);
    const timeframe = (url.searchParams.get("timeframe") ?? "30d").toLowerCase() as Timeframe;
    const modeFilter = normalizeMode(url.searchParams.get("mode")) ?? "all";
    const sinceMs = sinceForTimeframe(timeframe);

    const userGamesSnap = await adminDb.collection("users").doc(uid).collection("games").limit(300).get();
    const gameLinks = userGamesSnap.docs
      .map((doc) => ({ gameCode: readGameCode((doc.data() ?? {}) as UserGameDoc, doc.id), data: (doc.data() ?? {}) as UserGameDoc }))
      .filter((row): row is { gameCode: string; data: UserGameDoc } => Boolean(row.gameCode));

    const points: TrendPoint[] = [];
    for (const link of gameLinks) {
      const gameDoc = await adminDb.collection("games").doc(link.gameCode).get();
      if (!gameDoc.exists) continue;
      const game = (gameDoc.data() ?? {}) as GameDoc;
      const mode = normalizeMode(game.mode);
      if (modeFilter !== "all" && mode !== modeFilter) continue;
      const occurredAt = timestampToIso(game.endedAt) ?? timestampToIso(game.createdAt) ?? timestampToIso(link.data.createdAt) ?? timestampToIso(link.data.joinedAt);
      const occurredMs = occurredAt ? Date.parse(occurredAt) : NaN;
      if (sinceMs != null && Number.isFinite(occurredMs) && occurredMs < sinceMs) continue;

      const analytics = await findPlayerAnalyticsForGame(link.gameCode, uid);
      const eventCounts =
        analytics?.eventCounts && typeof analytics.eventCounts === "object"
          ? (analytics.eventCounts as Record<string, unknown>)
          : {};
      const kills =
        asNumber(analytics?.kills) ??
        asNumber(analytics?.confirmedCount) ??
        sumEventCounts(eventCounts, ["admin_confirm_kill_claim", "kill_claim_confirmed"]);
      const deaths =
        asNumber(analytics?.lifetimeCaught) ??
        asNumber(analytics?.caught) ??
        asNumber(analytics?.deaths) ??
        asNumber(analytics?.lifetimeDefeats) ??
        sumEventCounts(eventCounts, ["confirmed_against", "victim_confirmed_claim", "death"]);
      const pointsValue = asNumber(analytics?.points) ?? asNumber(analytics?.pointsEarned) ?? asNumber(analytics?.score) ?? 0;
      const mvpAwards = analytics ? readMvpCount(analytics) : 0;
      const winnerUid = asNonEmptyString(game.winnerUid) ?? asNonEmptyString(game.winningPlayerId);
      const won = (winnerUid != null && winnerUid === uid) || asBoolean(analytics?.won) === true;

      points.push({
        gameCode: link.gameCode,
        mode,
        occurredAt,
        kills: kills ?? 0,
        deaths: deaths ?? 0,
        won,
        points: pointsValue,
        mvpAwards,
      });
    }

    points.sort((a, b) => {
      const aMs = a.occurredAt ? Date.parse(a.occurredAt) : 0;
      const bMs = b.occurredAt ? Date.parse(b.occurredAt) : 0;
      return aMs - bMs;
    });

    const gamesPlayed = points.length;
    const wins = points.filter((point) => point.won).length;
    const kills = points.reduce((sum, point) => sum + point.kills, 0);
    const deaths = points.reduce((sum, point) => sum + point.deaths, 0);
    const bestStreak = points.reduce(
      (state, point) => {
        if (!point.won) return { current: 0, best: state.best };
        const current = state.current + 1;
        return { current, best: Math.max(state.best, current) };
      },
      { current: 0, best: 0 }
    ).best;
    const totalPoints = points.reduce((sum, point) => sum + point.points, 0);
    const mvpAwards = points.reduce((sum, point) => sum + point.mvpAwards, 0);

    return NextResponse.json({
      timeframe,
      mode: modeFilter,
      totals: {
        gamesPlayed,
        wins,
        kills,
        deaths,
        bestStreak,
        points: totalPoints,
        lifetimePoints: totalPoints,
        mvpAwards,
      },
      trend: points.slice(-60),
    });
  } catch (error) {
    if (error instanceof CurrentUserUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before loading stats trends." }, { status: 401 });
    }
    if (error instanceof CurrentUserInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[members:stats:trends] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load stats trends." }, { status: 500 });
  }
}
