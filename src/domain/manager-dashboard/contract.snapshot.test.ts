import { buildManagerDashboardPayload } from "@/domain/manager-dashboard/payload";

describe("manager_dashboard.v1 contract snapshot", () => {
  it("matches the canonical payload shape and units", () => {
    const payload = buildManagerDashboardPayload({
      gameCode: "SNAP01",
      game: {
        name: "Snapshot Session",
        mode: "classic",
        startedAt: "2026-03-19T19:55:00.000Z",
        endedAt: "2026-03-20T23:06:00.000Z",
        started: true,
        ended: true,
      },
      playerAnalyticsDocs: [
        {
          id: "p1",
          data: {
            playerId: "p1",
            displayName: "Alpha",
            claimCount: 5,
            confirmedCount: 4,
            deniedCount: 1,
            claimsAgainstConfirmed: 1,
            sessionCount: 1,
            eventCounts: {
              kill_claim: 5,
              admin_confirm_kill_claim: 4,
              admin_deny_kill_claim: 1,
            },
            updatedAt: "2026-03-20T23:07:00.000Z",
          },
        },
        {
          id: "p2",
          data: {
            playerId: "p2",
            displayName: "Bravo",
            claimCount: 1,
            confirmedCount: 1,
            deniedCount: 0,
            claimsAgainstConfirmed: 4,
            sessionCount: 1,
            eventCounts: {
              kill_claim: 1,
              admin_confirm_kill_claim: 1,
            },
          },
        },
      ],
      analyticsEvents: [
        { id: "e1", data: { eventType: "game_started" } },
        { id: "e2", data: { eventType: "game_ended" } },
      ],
      includeTimeline: true,
    });

    expect(payload).toMatchSnapshot();
  });
});
