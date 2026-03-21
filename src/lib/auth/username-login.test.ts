type MockDocRef = { collection: string; id: string };
type MockQuery = { collection: string; field: string; value: string };

type MockDocSnapshot = {
  exists: () => boolean;
  data: () => Record<string, unknown>;
};

const state: {
  usernameDocs: Record<string, Record<string, unknown>>;
  userDocs: Record<string, Record<string, unknown>>;
  accountDocs: Record<string, Record<string, unknown>>;
  signedInEmail: string | null;
} = {
  usernameDocs: {},
  userDocs: {},
  accountDocs: {},
  signedInEmail: null,
};

function makeDocSnapshot(value: Record<string, unknown> | null): MockDocSnapshot {
  return {
    exists: () => Boolean(value),
    data: () => value ?? {},
  };
}

vi.mock("@/lib/firebase", () => ({
  auth: { __auth: true },
  db: { __db: true },
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(async (_auth: unknown, email: string) => {
    state.signedInEmail = email;
    return { user: { uid: "uid-1", email } };
  }),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id } satisfies MockDocRef)),
  getDoc: vi.fn(async (ref: MockDocRef) => {
    if (ref.collection === "usernames") return makeDocSnapshot(state.usernameDocs[ref.id] ?? null);
    if (ref.collection === "users") return makeDocSnapshot(state.userDocs[ref.id] ?? null);
    if (ref.collection === "accounts") return makeDocSnapshot(state.accountDocs[ref.id] ?? null);
    return makeDocSnapshot(null);
  }),
  collection: vi.fn((_db: unknown, collectionName: string) => ({ collection: collectionName })),
  where: vi.fn((field: string, _op: string, value: string) => ({ field, value })),
  limit: vi.fn(() => ({ kind: "limit" })),
  query: vi.fn(
    (ref: { collection: string }, clause: { field: string; value: string }) =>
      ({ collection: ref.collection, field: clause.field, value: clause.value }) satisfies MockQuery
  ),
  getDocs: vi.fn(async (lookup: MockQuery) => {
    const matches = Object.values(state.userDocs).filter((entry) => entry[lookup.field] === lookup.value);
    return {
      docs: matches.map((entry) => ({
        data: () => entry,
      })),
    };
  }),
}));

import { resolveLoginIdentifier } from "@/lib/auth/username-login";

describe("username/email login identifier resolution", () => {
  beforeEach(() => {
    state.usernameDocs = {};
    state.userDocs = {};
    state.accountDocs = {};
    state.signedInEmail = null;
    vi.clearAllMocks();
  });

  it("resolves valid email identifiers through email path", async () => {
    await expect(resolveLoginIdentifier("  User@Example.com ")).resolves.toBe("user@example.com");
  });

  it("resolves plain wurder ID through username lookup path", async () => {
    state.usernameDocs["james23"] = {
      usernameLower: "james23",
      email: "james@example.com",
    };

    await expect(resolveLoginIdentifier("james23")).resolves.toBe("james@example.com");
  });

  it("resolves @-prefixed wurder ID through username lookup path", async () => {
    state.usernameDocs["james23"] = {
      usernameLower: "james23",
      email: "james@example.com",
    };

    await expect(resolveLoginIdentifier("@james23")).resolves.toBe("james@example.com");
  });

  it("returns clear account-not-found error for unknown wurder ID", async () => {
    await expect(resolveLoginIdentifier("unknown_user")).rejects.toThrow(
      "No account found with that Wurder ID."
    );
  });

  it("returns invalid email only for email-shaped invalid input", async () => {
    await expect(resolveLoginIdentifier("bad@email")).rejects.toThrow("Invalid email format.");
    await expect(resolveLoginIdentifier("@james23")).rejects.toThrow("No account found with that Wurder ID.");
  });
});
