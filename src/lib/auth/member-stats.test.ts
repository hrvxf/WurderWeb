import type { DocumentData } from "firebase/firestore";

type MockDocRef = { collection: string; id: string };

type MockSnapshot = {
  exists: () => boolean;
  data: () => DocumentData;
};

const state: {
  docs: Record<string, DocumentData | null>;
  failGetDocPaths: Record<string, Error>;
} = {
  docs: {},
  failGetDocPaths: {},
};

function pathFor(ref: MockDocRef): string {
  return `${ref.collection}/${ref.id}`;
}

function makeSnapshot(data: DocumentData | null): MockSnapshot {
  return {
    exists: () => data !== null,
    data: () => data ?? {},
  };
}

vi.mock("@/lib/firebase", () => ({
  db: { __db: true },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id } satisfies MockDocRef)),
  getDoc: vi.fn(async (ref: MockDocRef) => {
    const key = pathFor(ref);
    const configuredError = state.failGetDocPaths[key];
    if (configuredError) {
      throw configuredError;
    }
    return makeSnapshot(state.docs[key] ?? null);
  }),
}));

import { composeMemberData, DEFAULT_MEMBER_STATS, fetchMemberStatsSummary } from "@/lib/auth/member-stats";

describe("member stats loader", () => {
  beforeEach(() => {
    state.docs = {};
    state.failGetDocPaths = {};
    vi.restoreAllMocks();
  });

  it("reads gameplay aggregates from profiles/{uid} with expected field mapping", async () => {
    state.docs["profiles/uid-1"] = {
      gamesPlayed: 11,
      lifetimeWins: 4,
      lifetimeKills: 19,
      bestStreak: 6,
      lifetimePoints: 920,
    };

    const result = await fetchMemberStatsSummary("uid-1");

    expect(result.source).toBe("profiles/{uid}");
    expect(result.stats).toEqual({
      gamesPlayed: 11,
      wins: 4,
      kills: 19,
      deaths: 0,
      bestStreak: 6,
      points: 920,
      lifetimePoints: 920,
      mvpAwards: 0,
    });
    expect(result.warnings).toEqual([]);
  });

  it("returns fallback stats when profiles/{uid} is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await fetchMemberStatsSummary("uid-missing");

    expect(result.source).toBe("fallback-none");
    expect(result.stats).toEqual(DEFAULT_MEMBER_STATS);
    expect(result.warnings[0]?.code).toBe("stats-missing");
    expect(warnSpy).toHaveBeenCalledWith("[members] stats document missing", {
      uid: "uid-missing",
      path: "profiles/uid-missing",
    });
  });

  it("keeps identity profile when stats read fails", async () => {
    state.failGetDocPaths["profiles/uid-2"] = Object.assign(new Error("permission denied"), {
      code: "permission-denied",
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await composeMemberData({
      uid: "uid-2",
      profile: {
        uid: "uid-2",
        email: "adam@example.com",
        firstName: "Adam",
        lastName: "James",
        wurderId: "james23",
      },
    });

    expect(result.profile).toMatchObject({
      firstName: "Adam",
      lastName: "James",
      wurderId: "james23",
    });
    expect(result.stats).toEqual(DEFAULT_MEMBER_STATS);
    expect(result.sources).toEqual({
      profile: "accounts/{uid}",
      stats: "fallback-none",
    });
    expect(result.warnings[0]?.code).toBe("stats-unreadable");
    expect(warnSpy).toHaveBeenCalledWith("[members] failed to load gameplay stats", {
      uid: "uid-2",
      path: "profiles/uid-2",
      error: expect.any(Error),
    });
  });

  it("keeps profile source fixed to accounts while stats source points to profiles", async () => {
    state.docs["profiles/uid-3"] = {
      gamesPlayed: 2,
      lifetimeKills: 9,
      lifetimeWins: 1,
      lifetimePoints: 150,
      bestStreak: 2,
    };

    const result = await composeMemberData({
      uid: "uid-3",
      profile: {
        uid: "uid-3",
        email: "test@example.com",
        name: "Test User",
      },
    });

    expect(result.sources).toEqual({
      profile: "accounts/{uid}",
      stats: "profiles/{uid}",
    });
  });
});
