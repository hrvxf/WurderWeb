import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const setCalls: Array<{ path: string; data: Record<string, unknown> }> = [];

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  },
}));

vi.mock("@/domain/game/create-game", () => ({
  buildInitialGameDoc: vi.fn(({ gameCode, gameType, createdByAccountId, createdAt, wordGroupId, lastActionAt, initialAliveCount }) => ({
    gameCode,
    gameType,
    createdByAccountId,
    createdAt,
    wordGroupId,
    lastActionAt,
    aliveCount: initialAliveCount ?? 0,
    mode: "classic",
  })),
  generateGameCode: vi.fn(() => "ABC123"),
  resolveDefaultClassicWordGroupId: vi.fn(async () => null),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        path: `${name}/${id}`,
        get: async () => ({ exists: false, data: () => ({}) }),
      }),
    }),
    runTransaction: async (fn: (tx: { get: (doc: { get: () => Promise<{ exists: boolean }> }) => Promise<{ exists: boolean }>; set: (doc: { path: string }, data: Record<string, unknown>) => void }) => Promise<void>) => {
      const tx = {
        get: async (doc: { get: () => Promise<{ exists: boolean }> }) => doc.get(),
        set: (doc: { path: string }, data: Record<string, unknown>) => {
          setCalls.push({ path: doc.path, data });
        },
      };
      await fn(tx);
    },
  },
}));

import { createGameForHostUid } from "@/lib/game/create-game";

describe("createGameForHostUid b2b mode fields", () => {
  beforeEach(() => {
    setCalls.length = 0;
  });

  it("writes free-for-all survivor fields to top-level game doc", async () => {
    const result = await createGameForHostUid({
      hostUid: "host-1",
      gameType: "b2b",
      mode: "free_for_all",
      managerConfig: {
        mode: "free_for_all",
        durationMinutes: 30,
        wordDifficulty: "normal",
        teamsEnabled: false,
        metricsEnabled: [],
        minSecondsBeforeClaim: 0,
        minSecondsBetweenClaims: 0,
        maxActiveClaimsPerPlayer: 1,
        freeRefreshCooldownSeconds: 0,
        freeForAllVariant: "survivor",
      },
      freeForAllVariant: "survivor",
    });

    expect(result.gameCode).toBe("ABC123");
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]?.path).toBe("games/ABC123");
    expect(setCalls[0]?.data).toMatchObject({
      gameType: "b2b",
      mode: "free_for_all",
      freeForAllVariant: "survivor",
    });
    expect(setCalls[0]?.data).not.toHaveProperty("guildWinCondition");
  });

  it("writes guilds last-standing fields to top-level game doc", async () => {
    await createGameForHostUid({
      hostUid: "host-2",
      gameType: "b2b",
      mode: "guilds",
      managerConfig: {
        mode: "guilds",
        durationMinutes: 30,
        wordDifficulty: "normal",
        teamsEnabled: true,
        metricsEnabled: [],
        minSecondsBeforeClaim: 0,
        minSecondsBetweenClaims: 0,
        maxActiveClaimsPerPlayer: 1,
        freeRefreshCooldownSeconds: 0,
        guildWinCondition: "last_standing",
      },
      guildWinCondition: "last_standing",
    });

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]?.data).toMatchObject({
      gameType: "b2b",
      mode: "guilds",
      guildWinCondition: "last_standing",
    });
    expect(setCalls[0]?.data).not.toHaveProperty("freeForAllVariant");
  });

  it("writes free-for-all survivor variant to b2c game doc", async () => {
    await createGameForHostUid({
      hostUid: "host-b2c",
      gameType: "b2c",
      mode: "free_for_all",
      freeForAllVariant: "survivor",
      createdFrom: "b2c_setup",
      status: "waiting",
    });

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]?.data).toMatchObject({
      gameType: "b2c",
      mode: "free_for_all",
      freeForAllVariant: "survivor",
    });
  });

  it("throws when managerConfig.mode mismatches top-level mode", async () => {
    await expect(
      createGameForHostUid({
        hostUid: "host-3",
        gameType: "b2b",
        mode: "free_for_all",
        managerConfig: {
          mode: "classic",
          durationMinutes: 25,
          wordDifficulty: "medium",
          teamsEnabled: false,
          metricsEnabled: [],
          minSecondsBeforeClaim: 5,
          minSecondsBetweenClaims: 10,
          maxActiveClaimsPerPlayer: 1,
          freeRefreshCooldownSeconds: 12,
          freeForAllVariant: "survivor",
        },
        freeForAllVariant: "survivor",
      })
    ).rejects.toThrow("managerConfig.mode must match mode.");
  });

  it("throws when freeForAllVariant is sent for non-free_for_all mode", async () => {
    await expect(
      createGameForHostUid({
        hostUid: "host-4",
        gameType: "b2b",
        mode: "classic",
        freeForAllVariant: "survivor",
      })
    ).rejects.toThrow("freeForAllVariant is only allowed when mode is free_for_all.");
  });

  it("rejects b2c free-for-all games without a variant", async () => {
    await expect(
      createGameForHostUid({
        hostUid: "host-ffa-missing",
        gameType: "b2c",
        mode: "free_for_all",
        createdFrom: "b2c_setup",
        status: "waiting",
      })
    ).rejects.toThrow("freeForAllVariant is required when mode is free_for_all.");
  });

  it("rejects guilds games without a win condition", async () => {
    await expect(
      createGameForHostUid({
        hostUid: "host-guilds-missing",
        gameType: "b2b",
        mode: "guilds",
      })
    ).rejects.toThrow("guildWinCondition is required when mode is guilds.");
  });

  it("throws when guildWinCondition is sent for non-guilds mode", async () => {
    await expect(
      createGameForHostUid({
        hostUid: "host-5",
        gameType: "b2b",
        mode: "classic",
        guildWinCondition: "last_standing",
      })
    ).rejects.toThrow("guildWinCondition is only allowed when mode is guilds.");
  });
});
