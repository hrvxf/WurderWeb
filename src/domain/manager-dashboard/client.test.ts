import { coerceManagerDashboardPayload } from "@/domain/manager-dashboard/client";

describe("manager dashboard client coercion", () => {
  it("returns provided v1 payload and preserves overview gameCode when present", () => {
    const payload = coerceManagerDashboardPayload(
      {
        schemaVersion: "manager_dashboard.v1",
        overview: {
          gameCode: "ABC123",
          gameName: "A",
          lifecycleStatus: "in_progress",
          mode: "classic",
          startedAt: null,
          endedAt: null,
          totalPlayers: 1,
          activePlayers: 1,
          totalSessions: 1,
          totalEvents: 2,
          metricSemantics: {
            accuracy: { unit: "ratio_0_to_1", basis: "confirmed_claims_over_submitted_claims" },
            disputeRate: { unit: "ratio_0_to_1", basis: "denied_claims_over_submitted_claims" },
            kd: { unit: "ratio", basis: "kills_over_deaths" },
            deaths: { unit: "count", modeBasis: "confirmed_claims_against_player" },
          },
        },
        insights: [],
        playerPerformance: [],
        sessionSummary: {
          totalSessions: 1,
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
        updatedAt: null,
      },
      "FALLBK"
    );

    expect(payload.schemaVersion).toBe("manager_dashboard.v1");
    expect(payload.overview.gameCode).toBe("ABC123");
  });

  it("falls back to empty v1 payload for invalid input", () => {
    const payload = coerceManagerDashboardPayload(null, "XYZ999");

    expect(payload.schemaVersion).toBe("manager_dashboard.v1");
    expect(payload.overview.gameCode).toBe("XYZ999");
    expect(payload.playerPerformance).toEqual([]);
    expect(payload.insights).toEqual([]);
    expect(payload.recommendations).toEqual([]);
  });

  it("uses fallback gameCode when v1 payload has missing gameCode", () => {
    const payload = coerceManagerDashboardPayload(
      {
        schemaVersion: "manager_dashboard.v1",
        overview: {},
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
        updatedAt: null,
      },
      "RESOLVE1"
    );

    expect(payload.overview.gameCode).toBe("RESOLVE1");
  });
});
