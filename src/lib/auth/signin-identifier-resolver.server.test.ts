vi.mock("server-only", () => ({}));

const state: {
  usernameDocs: Record<string, Record<string, unknown>>;
  userDocs: Record<string, Record<string, unknown>>;
  accountDocs: Record<string, Record<string, unknown>>;
} = {
  usernameDocs: {},
  userDocs: {},
  accountDocs: {},
};

function userDocsByField(field: string, value: string): Array<Record<string, unknown>> {
  return Object.values(state.userDocs).filter((entry) => entry[field] === value);
}
function accountDocsByField(field: string, value: string): Array<Record<string, unknown>> {
  return Object.values(state.accountDocs).filter((entry) => entry[field] === value);
}

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: (collectionName: string) => {
      if (collectionName === "usernames") {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(state.usernameDocs[id]),
              data: () => state.usernameDocs[id] ?? {},
            }),
          }),
        };
      }

      if (collectionName === "users") {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(state.userDocs[id]),
              data: () => state.userDocs[id] ?? {},
            }),
          }),
          where: (field: string, _operator: string, value: string) => ({
            limit: () => ({
              get: async () => ({
                docs: userDocsByField(field, value).map((entry) => ({
                  data: () => entry,
                })),
              }),
            }),
          }),
        };
      }

      if (collectionName === "accounts") {
        return {
          doc: (id: string) => ({
            get: async () => ({
              exists: Boolean(state.accountDocs[id]),
              data: () => state.accountDocs[id] ?? {},
            }),
          }),
          where: (field: string, _operator: string, value: string) => ({
            limit: () => ({
              get: async () => ({
                docs: accountDocsByField(field, value).map((entry) => ({
                  data: () => entry,
                })),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected collection ${collectionName}`);
    },
  },
}));

import {
  InvalidIdentifierError,
  resolveSignInTarget,
  WurderIdNotFoundError,
} from "@/lib/auth/signin-identifier-resolver.server";

describe("server sign-in identifier resolver", () => {
  beforeEach(() => {
    state.usernameDocs = {};
    state.userDocs = {};
    state.accountDocs = {};
    vi.clearAllMocks();
  });

  it("returns email mode for email input", async () => {
    await expect(resolveSignInTarget(" User@Example.com ")).resolves.toEqual({
      mode: "email",
      email: "user@example.com",
    });
  });

  it("resolves plain wurder ID", async () => {
    state.usernameDocs.james23 = { usernameLower: "james23", email: "james@example.com" };

    await expect(resolveSignInTarget("james23")).resolves.toEqual({
      mode: "email",
      email: "james@example.com",
    });
  });

  it("resolves @prefixed wurder ID", async () => {
    state.usernameDocs.james23 = { usernameLower: "james23", email: "james@example.com" };

    await expect(resolveSignInTarget("@James23")).resolves.toEqual({
      mode: "email",
      email: "james@example.com",
    });
  });

  it("throws clear not found error for unknown wurder ID", async () => {
    await expect(resolveSignInTarget("unknown_user")).rejects.toBeInstanceOf(WurderIdNotFoundError);
  });

  it("throws validation error for invalid email", async () => {
    await expect(resolveSignInTarget("bad@email")).rejects.toBeInstanceOf(InvalidIdentifierError);
  });
});
