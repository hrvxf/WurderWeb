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
      guildWinCondition: null,
    });
  });

  it("writes guilds last-standing fields to top-level game doc", async () => {
    await createGameForHostUid({
      hostUid: "host-2",
      gameType: "b2b",
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
      freeForAllVariant: null,
      guildWinCondition: "last_standing",
    });
  });
});
