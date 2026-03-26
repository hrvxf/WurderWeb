import { buildManagerDashboardPayload } from "@/domain/manager-dashboard/payload";

describe("manager dashboard payload edge cases", () => {
  it("returns empty-not-started contract when no source data exists", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "EMPTY1",
      game: {
        name: "Empty Session",
        mode: "classic",
      },
      playerAnalyticsDocs: [],
      analyticsEvents: [],
    });

    expect(payload.overview.lifecycleStatus).toBe("not_started");
    expect(payload.overview.totalSessions).toBe(0);
    expect(payload.playerPerformance).toEqual([]);
    expect(payload.insights).toEqual([]);
    expect(payload.recommendations.map((item) => item.id)).toEqual(["no-session-history"]);
    expect(payload.sessionSummary.durationMs).toBeNull();
  });

  it("falls back to event streams when player analytics rows are missing", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "EVT001",
      game: {
        started: true,
      },
      playerAnalyticsDocs: [],
      analyticsEvents: [
        { id: "e1", data: { eventType: "kill_claim" } },
        { id: "e2", data: { eventType: "kill_claim" } },
        { id: "e3", data: { eventType: "admin_deny_kill_claim" } },
      ],
    });

    expect(payload.overview.totalEvents).toBe(3);
    expect(payload.insights.find((item) => item.id === "event_kill_claim")?.value).toBe(2);
    expect(payload.insights.find((item) => item.id === "event_admin_deny_kill_claim")?.value).toBe(1);
  });

  it("normalizes legacy percent accuracy fields to ratio values", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "PCT001",
      game: {
        mode: "classic",
        started: true,
      },
      playerAnalyticsDocs: [
        {
          id: "p1",
          data: {
            playerId: "p1",
            displayName: "Percent Player",
            accuracyPct: 80,
            claimCount: 10,
            confirmedCount: 8,
            claimsAgainstConfirmed: 2,
          },
        },
      ],
      analyticsEvents: [],
    });

    expect(payload.playerPerformance[0]?.accuracyRatio).toBeCloseTo(0.8, 6);
    expect(payload.playerPerformance[0]?.kdRatio).toBeCloseTo(4, 6);
  });

  it("sets team mode and team comparison when team-tagged events exist", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "TEAM01",
      game: {
        mode: "classic",
        started: true,
      },
      playerAnalyticsDocs: [
        {
          id: "p1",
          data: {
            playerId: "p1",
            displayName: "Team Player",
            eventCounts: {
              team_alpha_score: 3,
              team_bravo_score: 1,
            },
          },
        },
      ],
      analyticsEvents: [],
    });

    expect(payload.sessionSummary.teamMode).toBe(true);
    expect(payload.sessionSummary.teamComparison.length).toBeGreaterThan(0);
  });

  it("falls back displayName to player identity when name fields are missing", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "NAME01",
      game: {
        mode: "classic",
        started: true,
      },
      playerAnalyticsDocs: [
        {
          id: "doc-player-id",
          data: {
            userId: "user-42",
            claimCount: 2,
            confirmedCount: 1,
            claimsAgainstConfirmed: 1,
          },
        },
      ],
      analyticsEvents: [],
    });

    expect(payload.playerPerformance[0]?.playerId).toBe("user-42");
    expect(payload.playerPerformance[0]?.displayName).toBe("user-42");
    expect(payload.sessionSummary.topPerformer?.displayName).toBe("user-42");
  });
});
