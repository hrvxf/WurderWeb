import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureFirebaseWebUser } from "@/lib/auth/ensure-firebase-web-user";
import { auth } from "@/lib/firebase";
import { setupBrowserLocalPersistence } from "@/lib/auth/session";
import { signInAnonymously } from "firebase/auth";

vi.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock("@/lib/auth/session", () => ({
  setupBrowserLocalPersistence: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn(),
}));

const setupBrowserLocalPersistenceMock = vi.mocked(setupBrowserLocalPersistence);
const signInAnonymouslyMock = vi.mocked(signInAnonymously);

const authStub = auth as { currentUser: { uid: string } | null };

describe("ensureFirebaseWebUser", () => {
  beforeEach(() => {
    authStub.currentUser = null;
    setupBrowserLocalPersistenceMock.mockReset();
    signInAnonymouslyMock.mockReset();
    setupBrowserLocalPersistenceMock.mockResolvedValue();
  });

  it("returns the existing Firebase user when already signed in", async () => {
    const existingUser = { uid: "uid-existing" };
    authStub.currentUser = existingUser;

    const user = await ensureFirebaseWebUser();

    expect(setupBrowserLocalPersistenceMock).toHaveBeenCalledTimes(1);
    expect(signInAnonymouslyMock).not.toHaveBeenCalled();
    expect(user).toBe(existingUser);
  });

  it("signs in anonymously when no Firebase user exists", async () => {
    const anonymousUser = { uid: "uid-anon" };
    signInAnonymouslyMock.mockResolvedValue({ user: anonymousUser } as never);

    const user = await ensureFirebaseWebUser();

    expect(setupBrowserLocalPersistenceMock).toHaveBeenCalledTimes(1);
    expect(signInAnonymouslyMock).toHaveBeenCalledWith(auth);
    expect(user).toBe(anonymousUser);
  });
});
