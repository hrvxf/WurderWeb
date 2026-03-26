import type { ManagerDashboardPayload } from "@/domain/manager-dashboard/types";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function coerceManagerDashboardPayload(value: unknown, gameCode: string): ManagerDashboardPayload {
  const root = asObject(value);

  if (root.schemaVersion === "manager_dashboard.v1") {
    return {
      ...(root as ManagerDashboardPayload),
      schemaVersion: "manager_dashboard.v1",
      overview: {
        ...(root.overview as ManagerDashboardPayload["overview"]),
        gameCode: asString((root.overview as Record<string, unknown>)?.gameCode) ?? gameCode,
      },
      insights: Array.isArray(root.insights) ? (root.insights as ManagerDashboardPayload["insights"]) : [],
      playerPerformance: Array.isArray(root.playerPerformance)
        ? (root.playerPerformance as ManagerDashboardPayload["playerPerformance"])
        : [],
      recommendations: Array.isArray(root.recommendations)
        ? (root.recommendations as ManagerDashboardPayload["recommendations"])
        : [],
      timeline: Array.isArray(root.timeline) ? (root.timeline as ManagerDashboardPayload["timeline"]) : [],
    };
  }

  const nowIso = new Date().toISOString();
  return {
    schemaVersion: "manager_dashboard.v1",
    overview: {
      gameCode,
      gameName: gameCode,
      lifecycleStatus: "not_started",
      mode: null,
      startedAt: null,
      endedAt: null,
      totalPlayers: 0,
      activePlayers: 0,
      totalSessions: 0,
      totalEvents: 0,
      metricSemantics: {
        accuracy: { unit: "ratio_0_to_1", basis: "confirmed_claims_over_submitted_claims" },
        disputeRate: { unit: "ratio_0_to_1", basis: "denied_claims_over_submitted_claims" },
        kd: { unit: "ratio", basis: "kills_over_deaths" },
        deaths: { unit: "count", modeBasis: "fallback_death_events" },
      },
    },
    insights: [],
    playerPerformance: [],
    sessionSummary: {
      totalSessions: 0,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      avgSessionDurationMs: null,
      longestSessionDurationMs: null,
      lastSessionAt: null,
      totalKills: 0,
      totalDeaths: 0,
      totalClaimsSubmitted: 0,
      totalClaimsDenied: 0,
      topPerformer: null,
      coachingRisk: null,
      teamMode: false,
      teamComparison: [],
    },
    recommendations: [],
    updatedAt: asString(root.updatedAt) ?? nowIso,
    timeline: [],
  };
}
