import { describe, expect, it } from "vitest";

import { resolveDefeatsFromAnalyticsRow, resolveLifetimeDefeatsFromProfile } from "@/lib/analytics/player-metrics";

describe("player defeated/caught metrics", () => {
  it("prefers canonical defeated fields over legacy deaths in analytics rows", () => {
    expect(
      resolveDefeatsFromAnalyticsRow({
        defeats: 7,
        deaths: 2,
      })
    ).toBe(7);
  });

  it("falls back to legacy deaths when canonical fields are absent", () => {
    expect(resolveDefeatsFromAnalyticsRow({ deaths: 5 })).toBe(5);
  });

  it("resolves lifetime defeated counts from canonical profile fields", () => {
    expect(
      resolveLifetimeDefeatsFromProfile({
        lifetimeCaught: 11,
        lifetimeDeaths: 3,
      })
    ).toBe(11);
  });

  it("falls back to legacy lifetimeDeaths/deaths for backward compatibility", () => {
    expect(resolveLifetimeDefeatsFromProfile({ lifetimeDeaths: 4 })).toBe(4);
    expect(resolveLifetimeDefeatsFromProfile({ deaths: 6 })).toBe(6);
  });
});
