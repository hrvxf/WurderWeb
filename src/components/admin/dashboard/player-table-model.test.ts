import type { ManagerPlayerPerformance } from "@/components/admin/types";
import { computePlayerTableRows, nextSortState } from "@/components/admin/dashboard/player-table-model";

const rows: ManagerPlayerPerformance[] = [
  {
    playerId: "p1",
    displayName: "Alpha",
    kills: 5,
    deaths: 1,
    deathsBasis: "confirmed_claims_against_player",
    kdRatio: 5,
    claimsSubmitted: 5,
    claimsConfirmed: 5,
    claimsDenied: 0,
    accuracyRatio: 1,
    disputeRateRatio: 0,
    sessionCount: 2,
  },
  {
    playerId: "p2",
    displayName: "Bravo",
    kills: 2,
    deaths: 4,
    deathsBasis: "elimination_deaths",
    kdRatio: 0.5,
    claimsSubmitted: 3,
    claimsConfirmed: 2,
    claimsDenied: 1,
    accuracyRatio: 2 / 3,
    disputeRateRatio: 1 / 3,
    sessionCount: 0,
  },
  {
    playerId: "p3",
    displayName: "Charlie",
    kills: 3,
    deaths: 2,
    deathsBasis: "fallback_death_events",
    kdRatio: 1.5,
    claimsSubmitted: 4,
    claimsConfirmed: 3,
    claimsDenied: 1,
    accuracyRatio: 0.75,
    disputeRateRatio: 0.25,
    sessionCount: 1,
  },
];

describe("player table model", () => {
  it("searches by displayName and playerId", () => {
    const result = computePlayerTableRows(rows, {
      query: "char",
      sortKey: "kills",
      sortDirection: "desc",
      deathsBasisFilter: "all",
      activeOnly: false,
    });
    expect(result.map((r) => r.playerId)).toEqual(["p3"]);
  });

  it("applies death basis + active-only filters", () => {
    const result = computePlayerTableRows(rows, {
      query: "",
      sortKey: "kills",
      sortDirection: "desc",
      deathsBasisFilter: "elimination_deaths",
      activeOnly: true,
    });
    expect(result).toEqual([]);
  });

  it("sorts numerics descending then ascending", () => {
    const desc = computePlayerTableRows(rows, {
      query: "",
      sortKey: "kills",
      sortDirection: "desc",
      deathsBasisFilter: "all",
      activeOnly: false,
    });
    expect(desc.map((r) => r.playerId)).toEqual(["p1", "p3", "p2"]);

    const asc = computePlayerTableRows(rows, {
      query: "",
      sortKey: "kills",
      sortDirection: "asc",
      deathsBasisFilter: "all",
      activeOnly: false,
    });
    expect(asc.map((r) => r.playerId)).toEqual(["p2", "p3", "p1"]);
  });

  it("toggles sort direction when same key clicked", () => {
    expect(nextSortState("kills", "desc", "kills")).toEqual({ sortKey: "kills", sortDirection: "asc" });
    expect(nextSortState("kills", "asc", "kills")).toEqual({ sortKey: "kills", sortDirection: "desc" });
    expect(nextSortState("kills", "asc", "accuracyRatio")).toEqual({ sortKey: "accuracyRatio", sortDirection: "desc" });
  });
});
