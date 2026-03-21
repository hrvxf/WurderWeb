import { describe, expect, it } from "vitest";

import { resolveMemberRenderState } from "@/lib/auth/member-render-state";

describe("resolveMemberRenderState", () => {
  it("marks canonical member profiles complete", () => {
    const state = resolveMemberRenderState({
      uid: "uid-1",
      email: "user@example.com",
      wurderId: "Alex_1",
      firstName: "Alex",
      lastName: "Mason",
      stats: { gamesPlayed: 0, wins: 0, points: 0 },
    });

    expect(state.complete).toBe(true);
    expect(state.missingFields).toEqual([]);
  });

  it("reports missing canonical fields from the current render profile", () => {
    const state = resolveMemberRenderState({
      uid: "uid-2",
      email: "user2@example.com",
      wurderId: "",
      firstName: "",
      lastName: "",
      stats: { gamesPlayed: 0, wins: 0, points: 0 },
    });

    expect(state.complete).toBe(false);
    expect(state.missingFields).toEqual(["wurderId", "firstName", "lastName"]);
  });
});
