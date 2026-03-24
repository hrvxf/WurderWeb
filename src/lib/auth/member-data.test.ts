import { beforeEach, describe, expect, it, vi } from "vitest";

type DocValue = Record<string, unknown>;

const mockState: {
  docs: Map<string, DocValue>;
  readFailures: Set<string>;
  readPaths: string[];
  setDocCalls: Array<{ path: string; payload: Record<string, unknown> }>;
} = {
  docs: new Map(),
  readFailures: new Set(),
  readPaths: [],
  setDocCalls: [],
};

vi.mock("@/lib/firebase", () => ({
  db: { __db: true },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({
    collection,
    id,
    path: `${collection}/${id}`,
  })),
  getDoc: vi.fn(async (ref: { path: string }) => {
    mockState.readPaths.push(ref.path);
    if (mockState.readFailures.has(ref.path)) {
      throw new Error(`Read failed for ${ref.path}`);
    }
    const value = mockState.docs.get(ref.path);
    return {
      exists: () => value !== undefined,
      data: () => value,
    };
  }),
  setDoc: vi.fn(async (ref: { path: string }, payload: Record<string, unknown>) => {
    mockState.setDocCalls.push({ path: ref.path, payload });
    return undefined;
  }),
  serverTimestamp: vi.fn(() => "ts"),
  runTransaction: vi.fn(async () => undefined),
}));

import { DEFAULT_PROFILE_STATS } from "@/lib/types/user";
import { fetchUserProfile } from "@/lib/auth/profile-bootstrap";
import { fetchMemberData } from "@/lib/auth/member-data";

function setDoc(path: string, value: DocValue): void {
  mockState.docs.set(path, value);
}

describe("fetchMemberData", () => {
  beforeEach(() => {
    mockState.docs = new Map();
    mockState.readFailures = new Set();
    mockState.readPaths = [];
    mockState.setDocCalls = [];
  });

  it("loads identity from accounts/{uid} and stats from profiles/{uid}", async () => {
    setDoc("users/uid-1", {
      uid: "uid-1",
      email: "member@example.com",
      firstName: "Users",
      lastName: "Record",
      wurderId: "users-id",
    });
    setDoc("accounts/uid-1", {
      firstName: "Adam",
      secondName: "James",
      name: "Adam James",
      username: "james23",
      photoURL: "https://example.com/avatar.png",
    });
    setDoc("profiles/uid-1", {
      gamesPlayed: 7,
      lifetimeKills: 31,
      lifetimeWins: 4,
      lifetimePoints: 920,
      lifetimeCaught: 2,
      bestStreak: 3,
    });

    const result = await fetchMemberData("uid-1");

    expect(result.sources).toEqual({
      profile: "accounts/{uid}",
      stats: "profiles/{uid}",
    });
    expect(result.profile).toMatchObject({
      firstName: "Adam",
      lastName: "James",
      name: "Adam James",
      wurderId: "james23",
      avatarUrl: "https://example.com/avatar.png",
      email: "member@example.com",
    });
    expect(result.stats).toMatchObject({
      gamesPlayed: 7,
      wins: 4,
      kills: 31,
      deaths: 2,
      streak: 3,
      points: 920,
      pointsLifetime: 920,
    });
    expect(mockState.readPaths).toEqual(
      expect.arrayContaining(["users/uid-1", "accounts/uid-1", "profiles/uid-1"])
    );
  });

  it("ignores gameplay-like fields in accounts/{uid} and only binds stats from profiles/{uid}", async () => {
    setDoc("users/uid-5", {
      uid: "uid-5",
      email: "member@example.com",
      stats: {
        gamesPlayed: 1000,
        wins: 999,
        kills: 888,
        pointsLifetime: 777777,
      },
    });
    setDoc("accounts/uid-5", {
      firstName: "Adam",
      secondName: "James",
      username: "james23",
      gamesPlayed: 5000,
      lifetimeWins: 5000,
      lifetimeKills: 5000,
      lifetimePoints: 5000000,
      stats: {
        gamesPlayed: 6000,
        wins: 6000,
        kills: 6000,
      },
    });
    setDoc("profiles/uid-5", {
      gamesPlayed: 9,
      lifetimeKills: 42,
      lifetimeWins: 5,
      lifetimePoints: 1300,
      lifetimeDefeats: 6,
      bestStreak: 4,
    });

    const result = await fetchMemberData("uid-5");

    expect(result.sources).toEqual({
      profile: "accounts/{uid}",
      stats: "profiles/{uid}",
    });
    expect(result.profile?.stats).toMatchObject({
      gamesPlayed: 9,
      wins: 5,
      kills: 42,
      deaths: 6,
      streak: 4,
      points: 1300,
      pointsLifetime: 1300,
    });
  });

  it("falls back safely when profiles/{uid} is missing and keeps identity rendering", async () => {
    setDoc("accounts/uid-2", {
      firstName: "Adam",
      secondName: "James",
      name: "Adam James",
      username: "james23",
    });

    const result = await fetchMemberData("uid-2");

    expect(result.profile?.name).toBe("Adam James");
    expect(result.sources.stats).toBe("fallback-none");
    expect(result.stats).toEqual({ ...DEFAULT_PROFILE_STATS });
    expect(result.warnings.map((warning) => warning.code)).toContain("profiles-missing");
  });

  it("keeps page data non-fatal when accounts/{uid} is readable but stats doc is missing", async () => {
    setDoc("users/uid-3", {
      uid: "uid-3",
      email: "member@example.com",
    });
    setDoc("accounts/uid-3", {
      firstName: "Adam",
      secondName: "James",
      username: "james23",
    });

    await expect(fetchUserProfile("uid-3")).resolves.toMatchObject({
      firstName: "Adam",
      lastName: "James",
      wurderId: "james23",
      stats: { ...DEFAULT_PROFILE_STATS },
    });
  });

  it("distinguishes stats unreadable from stats missing and falls back to zero", async () => {
    setDoc("accounts/uid-4", {
      firstName: "Adam",
      secondName: "James",
      username: "james23",
    });
    mockState.readFailures.add("profiles/uid-4");

    const result = await fetchMemberData("uid-4");

    expect(result.stats).toEqual({ ...DEFAULT_PROFILE_STATS });
    expect(result.warnings.map((warning) => warning.code)).toContain("profiles-read-failed");
    expect(result.warnings.map((warning) => warning.code)).toContain("profiles-stats-fallback");
  });

  it("does not write aggregate stats into users/{uid} during identity backfill", async () => {
    setDoc("accounts/uid-6", {
      firstName: "Adam",
      secondName: "James",
      username: "james23",
    });
    setDoc("profiles/uid-6", {
      gamesPlayed: 12,
      lifetimeKills: 120,
      lifetimeWins: 8,
      lifetimePoints: 4100,
      bestStreak: 6,
    });

    await fetchMemberData("uid-6");

    expect(mockState.setDocCalls.length).toBeGreaterThan(0);
    for (const call of mockState.setDocCalls) {
      if (call.path !== "users/uid-6") continue;
      expect(call.payload).not.toHaveProperty("stats");
      expect(call.payload).not.toHaveProperty("gamesPlayed");
      expect(call.payload).not.toHaveProperty("lifetimeWins");
      expect(call.payload).not.toHaveProperty("lifetimeKills");
      expect(call.payload).not.toHaveProperty("lifetimePoints");
    }
  });
});
