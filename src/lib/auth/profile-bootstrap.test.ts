import type { DocumentData } from "firebase/firestore";

type MockDocRef = { collection: string; id: string };

type MockSnapshot = {
  exists: () => boolean;
  data: () => DocumentData;
};

type LookupDoc = {
  uid?: string;
  email?: string;
};

const state: {
  docs: Record<string, DocumentData | null>;
  existingLookup: LookupDoc | null;
  setCalls: Array<{ ref: MockDocRef; payload: Record<string, unknown>; options?: { merge?: boolean } }>;
} = {
  docs: {},
  existingLookup: null,
  setCalls: [],
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

vi.mock("firebase/firestore", () => {
  type MockTransaction = {
    get: (ref: MockDocRef) => Promise<MockSnapshot>;
    set: (ref: MockDocRef, payload: Record<string, unknown>) => void;
  };

  return {
    doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id } satisfies MockDocRef)),
    getDoc: vi.fn(async (ref: MockDocRef) => {
      if (ref.collection === "usernames") {
        return state.existingLookup ? makeSnapshot(state.existingLookup as DocumentData) : makeSnapshot(null);
      }
      return makeSnapshot(state.docs[pathFor(ref)] ?? null);
    }),
    setDoc: vi.fn(async (ref: MockDocRef, payload: Record<string, unknown>, options?: { merge?: boolean }) => {
      state.setCalls.push({ ref, payload, options });
      const key = pathFor(ref);
      const current = state.docs[key] ?? null;
      if (options?.merge && current) {
        state.docs[key] = {
          ...current,
          ...payload,
        };
      } else {
        state.docs[key] = payload;
      }
    }),
    serverTimestamp: vi.fn(() => "ts"),
    runTransaction: vi.fn(async (_db: unknown, updater: (tx: MockTransaction) => Promise<void>) => {
      const tx: MockTransaction = {
        get: vi.fn(async (ref: MockDocRef) => {
          if (ref.collection === "usernames") {
            return state.existingLookup
              ? makeSnapshot(state.existingLookup as DocumentData)
              : makeSnapshot(null);
          }
          return makeSnapshot(state.docs[pathFor(ref)] ?? null);
        }),
        set: vi.fn((ref: MockDocRef, payload: Record<string, unknown>) => {
          state.setCalls.push({ ref, payload });
        }),
      };
      await updater(tx);
    }),
  };
});

import {
  UsernameTakenError,
  claimUsernameForUser,
  ensureUserProfile,
  fetchUserProfile,
  updateUserProfile,
} from "@/lib/auth/profile-bootstrap";

describe("profile bootstrap + persistence", () => {
  beforeEach(() => {
    state.docs = {};
    state.existingLookup = null;
    state.setCalls = [];
    vi.restoreAllMocks();
  });

  it("claims a new normalized username when available", async () => {
    const normalized = await claimUsernameForUser({
      uid: "uid-1",
      email: "User@Example.com",
      wurderId: "  Alpha_User  ",
    });

    expect(normalized).toBe("alpha_user");
    expect(state.setCalls).toHaveLength(1);
    expect(state.setCalls[0]?.payload).toMatchObject({
      username: "Alpha_User",
      usernameLower: "alpha_user",
      uid: "uid-1",
      email: "user@example.com",
    });
  });

  it("rejects when username is already owned by another user", async () => {
    state.existingLookup = { uid: "uid-2", email: "other@example.com" };

    await expect(
      claimUsernameForUser({
        uid: "uid-1",
        email: "user@example.com",
        wurderId: "Alpha_User",
      })
    ).rejects.toBeInstanceOf(UsernameTakenError);
  });

  it("loads canonical users profile and backfills from accounts fallback without downgrading", async () => {
    state.docs["users/uid-1"] = {
      uid: "uid-1",
      email: "user@example.com",
      firstName: "Alex",
      lastName: "",
      name: "",
      wurderId: "Alex_1",
      stats: { gamesPlayed: 3 },
    };
    state.docs["accounts/uid-1"] = {
      firstName: "Alex",
      secondName: "Mason",
      username: "Alex_1",
      photoURL: "https://avatar.test/a.png",
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const profile = await fetchUserProfile("uid-1");

    expect(profile).toMatchObject({
      uid: "uid-1",
      firstName: "Alex",
      lastName: "Mason",
      wurderId: "Alex_1",
      avatarUrl: "https://avatar.test/a.png",
    });

    const backfillCall = state.setCalls.find((call) => pathFor(call.ref) === "users/uid-1");
    expect(backfillCall?.options).toEqual({ merge: true });
    expect(backfillCall?.payload).toMatchObject({
      lastName: "Mason",
      name: "Alex Mason",
      avatarUrl: "https://avatar.test/a.png",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[auth] profile-bootstrap recovered missing canonical identity fields for uid uid-1"
    );
  });


  it("maps legacy account fields to canonical completion fields for members area gating", async () => {
    state.docs["users/uid-legacy"] = {
      uid: "uid-legacy",
      email: "legacy@example.com",
      firstName: "",
      lastName: "",
      name: "",
      wurderId: "",
      avatarUrl: "",
      onboarding: { profileComplete: false },
      stats: { gamesPlayed: 1 },
    };
    state.docs["accounts/uid-legacy"] = {
      username: "hsajame3",
      firstName: "Adam",
      secondName: "James",
      photoURL: "https://avatar.test/adam.png",
    };

    const statusSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const profile = await fetchUserProfile("uid-legacy");

    expect(profile).toMatchObject({
      uid: "uid-legacy",
      wurderId: "hsajame3",
      firstName: "Adam",
      lastName: "James",
      avatarUrl: "https://avatar.test/adam.png",
    });

    expect(statusSpy).toHaveBeenCalledWith(
      "COMPLETION_CHECK",
      expect.objectContaining({ complete: true, missingFields: [] })
    );

    const write = state.setCalls.find((call) => pathFor(call.ref) === "users/uid-legacy");
    expect(write?.payload).toMatchObject({
      firstName: "Adam",
      lastName: "James",
      wurderId: "hsajame3",
      avatarUrl: "https://avatar.test/adam.png",
    });
  });
  it("partial form save does not clear existing canonical fields", async () => {
    state.docs["users/uid-1"] = {
      uid: "uid-1",
      email: "user@example.com",
      firstName: "Alex",
      lastName: "Mason",
      name: "Alex Mason",
      avatar: "https://avatar.test/original.png",
      avatarUrl: "https://avatar.test/original.png",
      wurderId: "Alex_1",
      wurderIdLower: "alex_1",
    };

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const next = await updateUserProfile("uid-1", {
      firstName: "   ",
      lastName: "",
      name: "",
      avatar: null,
      avatarUrl: null,
    });

    expect(next).toMatchObject({
      firstName: "Alex",
      lastName: "Mason",
      name: "Alex Mason",
      avatar: "https://avatar.test/original.png",
      avatarUrl: "https://avatar.test/original.png",
    });

    const write = state.setCalls.find((call) => pathFor(call.ref) === "users/uid-1");
    expect(write?.options).toEqual({ merge: true });
    expect(write?.payload).not.toHaveProperty("firstName");
    expect(write?.payload).not.toHaveProperty("lastName");
    expect(write?.payload).not.toHaveProperty("name");
    expect(write?.payload).not.toHaveProperty("avatar");
    expect(write?.payload).not.toHaveProperty("avatarUrl");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("ensureUserProfile keeps returning stored member profile for existing user", async () => {
    state.docs["users/uid-1"] = {
      uid: "uid-1",
      email: "user@example.com",
      firstName: "Alex",
      lastName: "Mason",
      name: "Alex Mason",
      wurderId: "Alex_1",
      wurderIdLower: "alex_1",
      onboarding: { profileComplete: true },
      stats: { gamesPlayed: 10 },
    };

    const result = await ensureUserProfile({
      uid: "uid-1",
      email: "user@example.com",
      displayName: "",
      photoURL: null,
    } as never);

    expect(result).toMatchObject({
      uid: "uid-1",
      firstName: "Alex",
      lastName: "Mason",
      wurderId: "Alex_1",
      onboarding: { profileComplete: true },
    });

    const writesToUsers = state.setCalls.filter((call) => pathFor(call.ref) === "users/uid-1");
    expect(writesToUsers).toHaveLength(1);
    expect(writesToUsers[0]?.options).toEqual({ merge: true });
  });

  it("canonical accounts profile wins over sparse or stale users/auth payloads on reload/login", async () => {
    state.docs["users/uid-1"] = {
      uid: "uid-1",
      email: "user@example.com",
      firstName: "",
      lastName: "",
      name: "",
      wurderId: "",
      avatarUrl: "",
      onboarding: { profileComplete: false },
      stats: { gamesPlayed: 2 },
    };
    state.docs["accounts/uid-1"] = {
      firstName: "Alex",
      lastName: "Mason",
      wurderId: "Alex_1",
      wurderIdLower: "alex_1",
      avatarUrl: "https://avatar.test/a.png",
      name: "Alex Mason",
    };

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await ensureUserProfile(
      {
        uid: "uid-1",
        email: "user@example.com",
        displayName: "",
        photoURL: null,
      } as never,
      {
        firstName: "",
        lastName: "",
        name: "",
        avatar: null,
      }
    );

    expect(result).toMatchObject({
      firstName: "Alex",
      lastName: "Mason",
      wurderId: "Alex_1",
      avatarUrl: "https://avatar.test/a.png",
      onboarding: { profileComplete: true },
    });

    const write = state.setCalls.find((call) => pathFor(call.ref) === "users/uid-1");
    expect(write?.payload).toMatchObject({
      firstName: "Alex",
      lastName: "Mason",
      wurderId: "Alex_1",
      avatarUrl: "https://avatar.test/a.png",
    });
    expect(infoSpy).toHaveBeenCalledWith(
      "COMPLETION_CHECK",
      expect.objectContaining({ complete: true, missingFields: [] })
    );
  });

  it("does not downgrade canonical account identity during provider-link style bootstrap", async () => {
    state.docs["users/uid-2"] = {
      uid: "uid-2",
      email: "user2@example.com",
      firstName: "Alex",
      lastName: "Mason",
      name: "Alex Mason",
      wurderId: "Alex_1",
      wurderIdLower: "alex_1",
      avatarUrl: "https://avatar.test/a.png",
      onboarding: { profileComplete: true },
      stats: { gamesPlayed: 11 },
    };
    state.docs["accounts/uid-2"] = {
      firstName: "Alex",
      secondName: "Mason",
      username: "Alex_1",
      usernameLower: "alex_1",
      photoURL: "https://avatar.test/a.png",
    };

    const result = await ensureUserProfile(
      {
        uid: "uid-2",
        email: "user2@example.com",
        displayName: "",
        photoURL: "",
      } as never,
      {
        name: "",
        avatar: "",
      }
    );

    expect(result).toMatchObject({
      firstName: "Alex",
      lastName: "Mason",
      name: "Alex Mason",
      wurderId: "Alex_1",
      avatarUrl: "https://avatar.test/a.png",
      onboarding: { profileComplete: true },
    });
  });
});
