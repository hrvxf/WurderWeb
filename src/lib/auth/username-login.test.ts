const state: {
  signedInEmail: string | null;
} = {
  signedInEmail: null,
};

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/firebase", () => ({
  auth: { __auth: true },
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(async (_auth: unknown, email: string) => {
    state.signedInEmail = email;
    return { user: { uid: "uid-1", email } };
  }),
}));

vi.mock("firebase/firestore", () => {
  throw new Error("username-login should not import firebase/firestore");
});

import { resolveLoginIdentifier } from "@/lib/auth/username-login";

describe("username/email login identifier resolution", () => {
  beforeEach(() => {
    state.signedInEmail = null;
    fetchMock.mockReset();
    vi.clearAllMocks();
  });

  it("resolves valid email identifiers through email path", async () => {
    await expect(resolveLoginIdentifier("  User@Example.com ")).resolves.toBe("user@example.com");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves plain wurder ID through trusted API path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ mode: "email", email: "james@example.com" }),
    });

    await expect(resolveLoginIdentifier("james23")).resolves.toBe("james@example.com");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/resolve-login-identifier", expect.any(Object));
  });

  it("resolves @-prefixed wurder ID through trusted API path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ mode: "email", email: "james@example.com" }),
    });

    await expect(resolveLoginIdentifier("@james23")).resolves.toBe("james@example.com");
  });

  it("returns clear account-not-found error for unknown wurder ID", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ code: "WURDER_ID_NOT_FOUND" }),
    });

    await expect(resolveLoginIdentifier("unknown_user")).rejects.toThrow(
      "No account found with that Wurder ID."
    );
  });

  it("returns invalid email only for email-shaped invalid input", async () => {
    await expect(resolveLoginIdentifier("bad@email")).rejects.toThrow("Invalid email format.");
  });
});
