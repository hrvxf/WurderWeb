import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { loadManagerDashboardCache, resolveOrgKpiThresholds } from "@/lib/manager/dashboard-cache";
import {
  assertManagerAccessForGame,
  ManagerAccessInfrastructureError,
  ManagerForbiddenError,
  ManagerGameNotFoundError,
  ManagerUnauthenticatedError,
} from "@/lib/manager/access";

export const runtime = "nodejs";

type PlayerAggregate = {
  playerId: string;
  displayName: string;
  avatarUrl: string | null;
  games: number;
  kills: number;
  deaths: number;
  avgKdRatio: number | null;
  avgAccuracyRatio: number | null;
  avgDisputeRateRatio: number | null;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export async function GET(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const { gameCode } = await params;
    const normalizedCode = gameCode.trim().toUpperCase();
    await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);

    const gameDoc = await adminDb.collection("games").doc(normalizedCode).get();
    const game = (gameDoc.data() ?? {}) as { orgId?: unknown };
    const orgId = asNonEmptyString(game.orgId);
    if (!orgId) {
      return NextResponse.json({ code: "ORG_NOT_FOUND", message: "Game is not linked to an organization." }, { status: 404 });
    }

    const thresholds = await resolveOrgKpiThresholds(orgId);
    const cachedDashboardsSnap = await adminDb.collection("managerDashboard").where("orgId", "==", orgId).limit(200).get();

    const dashboards = cachedDashboardsSnap.docs
      .map((doc) => doc.data())
      .map((row) => ({
        gameCode: asNonEmptyString(row.gameCode) ?? "",
        generatedAt: typeof row.generatedAt === "string" ? row.generatedAt : null,
        analytics: row.analytics,
      }))
      .filter((entry) => entry.gameCode.length > 0 && entry.analytics && typeof entry.analytics === "object")
      .sort((a, b) => {
        const aMs = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
        const bMs = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
        return bMs - aMs;
      });

    const fallbackCurrent = dashboards.some((entry) => entry.gameCode === normalizedCode)
      ? null
      : await loadManagerDashboardCache(normalizedCode);
    if (fallbackCurrent) {
      dashboards.unshift({
        gameCode: normalizedCode,
        generatedAt: fallbackCurrent.generatedAt,
        analytics: fallbackCurrent.analytics,
      });
    }

    const trendPoints = dashboards.slice(0, 60).map((entry, index) => {
      const analytics = entry.analytics as {
        updatedAt?: unknown;
        sessionSummary?: { totalKills?: unknown; totalDeaths?: unknown };
        insights?: Array<{ id?: unknown; value?: unknown }>;
      };
      const disputeRate =
        analytics.insights?.find((insight) => insight.id === "dispute_rate")?.value != null
          ? Number(analytics.insights?.find((insight) => insight.id === "dispute_rate")?.value)
          : null;
      return {
        index: index + 1,
        gameCode: entry.gameCode,
        updatedAt: typeof analytics.updatedAt === "string" ? analytics.updatedAt : entry.generatedAt,
        totalKills:
          analytics.sessionSummary?.totalKills != null && Number.isFinite(Number(analytics.sessionSummary.totalKills))
            ? Number(analytics.sessionSummary.totalKills)
            : 0,
        totalDeaths:
          analytics.sessionSummary?.totalDeaths != null && Number.isFinite(Number(analytics.sessionSummary.totalDeaths))
            ? Number(analytics.sessionSummary.totalDeaths)
            : 0,
        disputeRateRatio: disputeRate != null && Number.isFinite(disputeRate) ? disputeRate : null,
      };
    });

    const byPlayer = new Map<string, PlayerAggregate & { kd: Array<number | null>; accuracy: Array<number | null>; dispute: Array<number | null> }>();
    for (const entry of dashboards.slice(0, 80)) {
      const analytics = entry.analytics as { playerPerformance?: Array<Record<string, unknown>> };
      const players = Array.isArray(analytics.playerPerformance) ? analytics.playerPerformance : [];
      for (const player of players) {
        const playerId = asNonEmptyString(player.playerId);
        if (!playerId) continue;
        const existing = byPlayer.get(playerId) ?? {
          playerId,
          displayName: asNonEmptyString(player.displayName) ?? playerId,
          avatarUrl: asNonEmptyString(player.avatarUrl),
          games: 0,
          kills: 0,
          deaths: 0,
          avgKdRatio: null,
          avgAccuracyRatio: null,
          avgDisputeRateRatio: null,
          kd: [],
          accuracy: [],
          dispute: [],
        };
        existing.displayName = asNonEmptyString(player.displayName) ?? existing.displayName;
        existing.avatarUrl = asNonEmptyString(player.avatarUrl) ?? existing.avatarUrl;
        existing.games += 1;
        existing.kills += Number(player.kills ?? 0) || 0;
        existing.deaths += Number(player.deaths ?? 0) || 0;
        existing.kd.push(Number.isFinite(Number(player.kdRatio)) ? Number(player.kdRatio) : null);
        existing.accuracy.push(Number.isFinite(Number(player.accuracyRatio)) ? Number(player.accuracyRatio) : null);
        existing.dispute.push(Number.isFinite(Number(player.disputeRateRatio)) ? Number(player.disputeRateRatio) : null);
        byPlayer.set(playerId, existing);
      }
    }

    const players = [...byPlayer.values()]
      .map((row) => ({
        playerId: row.playerId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        games: row.games,
        kills: row.kills,
        deaths: row.deaths,
        avgKdRatio: average(row.kd),
        avgAccuracyRatio: average(row.accuracy),
        avgDisputeRateRatio: average(row.dispute),
      }))
      .sort((a, b) => (b.games - a.games) || (b.kills - a.kills));

    const cohorts = {
      highRisk: players.filter((player) => (player.avgKdRatio ?? 99) < 0.8 || player.deaths / Math.max(player.games, 1) >= 3).map((player) => player.playerId),
      highDispute: players
        .filter((player) => (player.avgDisputeRateRatio ?? 0) >= thresholds.disputeRateWarningRatio)
        .map((player) => player.playerId),
      lowAccuracy: players.filter((player) => (player.avgAccuracyRatio ?? 1) < 0.5).map((player) => player.playerId),
    };

    return NextResponse.json({
      orgId,
      gameCode: normalizedCode,
      thresholds,
      presets: [
        { id: "highRisk", label: "High Risk" },
        { id: "highDispute", label: "High Dispute" },
        { id: "lowAccuracy", label: "Low Accuracy" },
      ],
      cohorts,
      players,
      aggregateTrend: trendPoints,
    });
  } catch (error) {
    if (error instanceof ManagerUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "You must sign in first." }, { status: 401 });
    }
    if (error instanceof ManagerForbiddenError) {
      return NextResponse.json({ code: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof ManagerGameNotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Game not found." }, { status: 404 });
    }
    if (error instanceof ManagerAccessInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[manager:compare] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load compare analytics." }, { status: 500 });
  }
}
