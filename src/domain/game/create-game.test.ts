import { describe, expect, it } from "vitest";
import { buildInitialGameDoc, generateGameCode } from "@/domain/game/create-game";

describe("game create helpers", () => {
  it("generates a six-character uppercase game code", () => {
    const code = generateGameCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("builds native-compatible default game payload", () => {
    const gameDoc = buildInitialGameDoc({
      gameCode: "ABC123",
      hostPlayerId: "uid-1",
      createdAt: "timestamp" as never,
      wordGroupId: "classic-default",
      lastActionAt: 123456789,
      classicMaxHuntersPerVictim: 3,
      classicPointsToWin: 25,
    });

    expect(gameDoc.hostPlayerId).toBe("uid-1");
    expect(gameDoc.started).toBe(false);
    expect(gameDoc.ended).toBe(false);
    expect(gameDoc.mode).toBe("classic");
    expect(gameDoc.wordStyle).toBe("classic");
    expect(gameDoc.classicMaxHuntersPerVictim).toBe(3);
    expect(gameDoc.classicPointsToWin).toBe(25);
    expect(gameDoc.paused).toBe(false);
    expect(gameDoc.startedBy).toBeNull();
    expect(gameDoc.winnerPlayerId).toBeNull();
  });
});
