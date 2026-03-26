import type {
  ManagerAnalyticsDocument,
  ManagerGameOverview,
  ManagerInsight,
  ManagerPlayerPerformance,
  ManagerSessionSummary,
} from "@/components/admin/types";
import {
  buildClaimsFunnelSeries,
  buildDeathsBasisSeries,
  buildInsightBarSeries,
  buildOverviewSnapshot,
  buildPlayerScatterSeries,
} from "@/components/admin/dashboard/chart-adapters";

function baseOverview(): ManagerGameOverview {
  return {
    gameCode: "ABC123",
    gameName: "Alpha",
    lifecycleStatus: "completed",
    mode: "classic",
    startedAt: null,
    endedAt: null,
    totalPlayers: 3,
    activePlayers: 3,
    totalSessions: 1,
    totalEvents: 10,
    metricSemantics: {
      accuracy: { unit: "ratio_0_to_1", basis: "confirmed_claims_over_submitted_claims" },
      disputeRate: { unit: "ratio_0_to_1", basis: "denied_claims_over_submitted_claims" },
      kd: { unit: "ratio", basis: "kills_over_deaths" },
      deaths: { unit: "count", modeBasis: "confirmed_claims_against_player" },
    },
  };
}

function baseSummary(): ManagerSessionSummary {
  return {
    totalSessions: 1,
    startedAt: null,
    endedAt: null,
    durationMs: 120000,
    avgSessionDurationMs: 120000,
    longestSessionDurationMs: 120000,
    lastSessionAt: null,
    totalKills: 5,
    totalDeaths: 3,
    totalClaimsSubmitted: 6,
    totalClaimsDenied: 1,
    topPerformer: null,
    coachingRisk: null,
    teamMode: false,
    teamComparison: [],
  };
}

describe("chart adapters", () => {
  it("maps insights to sorted bar series", () => {
    const insights: ManagerInsight[] = [
      { id: "i1", label: "A", value: 2, unit: "count", severity: "info", message: "" },
      { id: "i2", label: "B", value: 7, unit: "count", severity: "warning", message: "" },
      { id: "i3", label: "C", value: null, unit: "count", severity: "info", message: "" },
    ];
    const bars = buildInsightBarSeries(insights);
    expect(bars.map((item) => item.id)).toEqual(["i2", "i1"]);
  });

  it("maps claims funnel from summary totals", () => {
    const funnel = buildClaimsFunnelSeries(baseSummary());
    expect(funnel).toEqual([
      { id: "submitted", label: "Claims Submitted", value: 6, unit: "count" },
      { id: "confirmed", label: "Claims Confirmed", value: 5, unit: "count" },
      { id: "denied", label: "Claims Denied", value: 1, unit: "count" },
    ]);
  });

  it("maps players to scatter points only when ratio fields exist", () => {
    const players: ManagerPlayerPerformance[] = [
      {
        playerId: "p1",
        displayName: "One",
        kills: 3,
        deaths: 1,
        deathsBasis: "confirmed_claims_against_player",
        kdRatio: 3,
        claimsSubmitted: 3,
        claimsConfirmed: 3,
        claimsDenied: 0,
        accuracyRatio: 1,
        disputeRateRatio: 0,
        sessionCount: 1,
      },
      {
        playerId: "p2",
        displayName: "Two",
        kills: 0,
        deaths: 0,
        deathsBasis: "confirmed_claims_against_player",
        kdRatio: null,
        claimsSubmitted: null,
        claimsConfirmed: null,
        claimsDenied: null,
        accuracyRatio: null,
        disputeRateRatio: null,
        sessionCount: null,
      },
    ];
    const points = buildPlayerScatterSeries(players);
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ id: "p1", x: 1, y: 3, size: 3 });
  });

  it("builds deaths basis distribution and overview snapshot", () => {
    const players: ManagerPlayerPerformance[] = [
      {
        playerId: "p1",
        displayName: "One",
        kills: 1,
        deaths: 1,
        deathsBasis: "confirmed_claims_against_player",
        kdRatio: 1,
        claimsSubmitted: 1,
        claimsConfirmed: 1,
        claimsDenied: 0,
        accuracyRatio: 1,
        disputeRateRatio: 0,
        sessionCount: 1,
      },
      {
        playerId: "p2",
        displayName: "Two",
        kills: 1,
        deaths: 1,
        deathsBasis: "elimination_deaths",
        kdRatio: 1,
        claimsSubmitted: 1,
        claimsConfirmed: 1,
        claimsDenied: 0,
        accuracyRatio: 1,
        disputeRateRatio: 0,
        sessionCount: 1,
      },
    ];
    const deaths = buildDeathsBasisSeries(players);
    expect(deaths.find((item) => item.id === "confirmed_claims_against_player")?.value).toBe(1);
    expect(deaths.find((item) => item.id === "elimination_deaths")?.value).toBe(1);

    const overview = buildOverviewSnapshot(baseOverview());
    expect(overview).toEqual([
      { id: "players", label: "Players", value: 3, unit: "count" },
      { id: "sessions", label: "Sessions", value: 1, unit: "count" },
      { id: "events", label: "Events", value: 10, unit: "count" },
    ]);
  });
});
