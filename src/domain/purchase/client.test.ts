import { buildPurchasePayload, mapPurchaseError } from "@/domain/purchase/client";

describe("purchase client helpers", () => {
  it("builds trimmed payload", () => {
    expect(buildPurchasePayload("  Game  ", 10, [" Guilds ", ""]))
      .toEqual({ gameName: "Game", players: 10, addons: ["Guilds"] });
  });

  it("maps unknown errors", () => {
    expect(mapPurchaseError(undefined)).toBe("Unable to process purchase right now.");
  });
});
