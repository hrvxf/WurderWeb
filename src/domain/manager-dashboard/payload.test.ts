import { buildManagerDashboardPayload } from "@/domain/manager-dashboard/payload";

describe("manager dashboard payload builder", () => {
  it("computes classic-mode metrics with ratio units and explicit death basis", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "ABC123",
      game: {
        name: "Session Alpha",
        mode: "classic",
        startedAt: "2026-01-01T10:00:00.000Z",
        endedAt: "2026-01-01T10:01:00.000Z",
        started: true,
        ended: true,
      },
      playerAnalyticsDocs: [
        {
          id: "p1",
          data: {
            playerId: "p1",
            displayName: "Player One",
            confirmedCount: 4,
            claimCount: 5,
            deniedCount: 1,
            claimsAgainstConfirmed: 2,
            sessionCount: 1,
            updatedAt: "2026-01-01T10:01:10.000Z",
          },
        },
      ],
      analyticsEvents: [],
    });

    expect(payload.schemaVersion).toBe("manager_dashboard.v1");
    expect(payload.overview.lifecycleStatus).toBe("completed");
    expect(payload.overview.metricSemantics.deaths.modeBasis).toBe("confirmed_claims_against_player");
    expect(payload.sessionSummary.durationMs).toBe(60_000);

    expect(payload.playerPerformance).toHaveLength(1);
    expect(payload.playerPerformance[0]).toMatchObject({
      playerId: "p1",
      kills: 4,
      deaths: 2,
      deathsBasis: "confirmed_claims_against_player",
      kdRatio: 2,
      accuracyRatio: 0.8,
      disputeRateRatio: 0.2,
    });

    const disputeRate = payload.insights.find((item) => item.id === "dispute_rate");
    expect(disputeRate?.unit).toBe("ratio");
    expect(disputeRate?.value).toBeCloseTo(0.2, 6);
  });

  it("uses elimination death basis for elimination modes", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "XYZ999",
      game: {
        mode: "elimination",
        started: true,
      },
      playerAnalyticsDocs: [
        {
          id: "p2",
          data: {
            playerId: "p2",
            displayName: "Player Two",
            kills: 6,
            eliminationDeaths: 3,
            claimCount: 6,
            confirmedCount: 6,
            deniedCount: 0,
          },
        },
      ],
      analyticsEvents: [],
    });

    expect(payload.overview.metricSemantics.deaths.modeBasis).toBe("elimination_deaths");
    expect(payload.playerPerformance[0]?.deathsBasis).toBe("elimination_deaths");
    expect(payload.playerPerformance[0]?.deaths).toBe(3);
    expect(payload.playerPerformance[0]?.kdRatio).toBe(2);
  });

  it("generates recommendation signals from risk thresholds", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "RISK01",
      game: {
        mode: "classic",
        started: true,
        ended: true,
      },
      playerAnalyticsDocs: [
        {
          id: "p3",
          data: {
            playerId: "p3",
            displayName: "Risky Player",
            claimCount: 10,
            confirmedCount: 2,
            deniedCount: 5,
            claimsAgainstConfirmed: 12,
            sessionCount: 1,
          },
        },
      ],
      analyticsEvents: [],
    });

    const recommendationIds = payload.recommendations.map((item) => item.id);
    expect(recommendationIds).toContain("deaths-focus");
    expect(recommendationIds).toContain("dispute-rate");
    expect(recommendationIds).toContain("accuracy-drill");
  });
});
