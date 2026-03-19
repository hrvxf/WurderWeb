type LookupDoc = {
  uid?: string;
  email?: string;
};

const state: {
  existingLookup: LookupDoc | null;
  setCalls: Array<{ ref: unknown; payload: Record<string, unknown> }>;
} = {
  existingLookup: null,
  setCalls: [],
};

vi.mock("@/lib/firebase", () => ({
  db: { __db: true },
}));

vi.mock("firebase/firestore", () => {
  type MockTransaction = {
    get: (ref: unknown) => Promise<{ exists: () => boolean; data: () => LookupDoc | undefined }>;
    set: (ref: unknown, payload: Record<string, unknown>) => void;
  };

  return {
    doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => "ts"),
    runTransaction: vi.fn(async (_db: unknown, updater: (tx: MockTransaction) => Promise<void>) => {
      state.setCalls = [];
      const tx: MockTransaction = {
        get: vi.fn(async () => {
          if (!state.existingLookup) {
            return {
              exists: () => false,
              data: () => undefined,
            };
          }
          return {
            exists: () => true,
            data: () => state.existingLookup,
          };
        }),
        set: vi.fn((ref: unknown, payload: Record<string, unknown>) => {
          state.setCalls.push({ ref, payload });
        }),
      };
      await updater(tx);
    }),
  };
});

import { UsernameTakenError, claimUsernameForUser } from "@/lib/auth/profile-bootstrap";

describe("claimUsernameForUser", () => {
  beforeEach(() => {
    state.existingLookup = null;
    state.setCalls = [];
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

  it("is idempotent when the username is already owned by same uid", async () => {
    state.existingLookup = { uid: "uid-1", email: "other@example.com" };

    await expect(
      claimUsernameForUser({
        uid: "uid-1",
        email: "user@example.com",
        wurderId: "Alpha_User",
      })
    ).resolves.toBe("alpha_user");

    expect(state.setCalls).toHaveLength(0);
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

  it("rejects invalid wurder IDs before transaction", async () => {
    await expect(
      claimUsernameForUser({
        uid: "uid-1",
        email: "user@example.com",
        wurderId: "bad id!",
      })
    ).rejects.toThrow("Wurder ID must be 3-20 characters using letters, numbers, or underscores.");

    expect(state.setCalls).toHaveLength(0);
  });
});
