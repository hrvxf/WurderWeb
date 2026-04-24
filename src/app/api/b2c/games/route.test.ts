import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/b2c/games/route";
import { createGameForHostUid } from "@/lib/game/create-game";
import { verifyFirebaseAuthHeader, FirebaseAuthUnauthenticatedError } from "@/lib/auth/verify-firebase-auth-header";

vi.mock("@/lib/game/create-game", () => ({
  createGameForHostUid: vi.fn(),
  GameCodeCollisionError: class GameCodeCollisionError extends Error {},
}));

vi.mock("@/lib/handoff/setup-drafts", () => ({
  requireActiveHandoffSetupDraft: vi.fn(),
  HandoffSetupConsumedError: class HandoffSetupConsumedError extends Error {},
  HandoffSetupExpiredError: class HandoffSetupExpiredError extends Error {},
  HandoffSetupNotFoundError: class HandoffSetupNotFoundError extends Error {},
}));

vi.mock("@/lib/auth/verify-firebase-auth-header", () => ({
  verifyFirebaseAuthHeader: vi.fn(),
  FirebaseAuthUnauthenticatedError: class FirebaseAuthUnauthenticatedError extends Error {},
  FirebaseAuthInfrastructureError: class FirebaseAuthInfrastructureError extends Error {},
}));

const createGameForHostUidMock = vi.mocked(createGameForHostUid);
const verifyFirebaseAuthHeaderMock = vi.mocked(verifyFirebaseAuthHeader);

function buildRequest(headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/b2c/games", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ mode: "classic" }),
  });
}

describe("POST /api/b2c/games", () => {
  beforeEach(() => {
    createGameForHostUidMock.mockReset();
    verifyFirebaseAuthHeaderMock.mockReset();

    verifyFirebaseAuthHeaderMock.mockResolvedValue("uid-host");
    createGameForHostUidMock.mockResolvedValue({
      gameCode: "ABCD",
      config: { gameType: "b2c", mode: "classic" },
    } as never);
  });

  it("creates a b2c game when provided a valid Firebase bearer token", async () => {
    const response = await POST(buildRequest({ authorization: "Bearer token-valid" }));
    const payload = (await response.json()) as { gameCode?: string };

    expect(response.status).toBe(201);
    expect(verifyFirebaseAuthHeaderMock).toHaveBeenCalledWith("Bearer token-valid");
    expect(createGameForHostUidMock).toHaveBeenCalledWith(
      expect.objectContaining({ hostUid: "uid-host", gameType: "b2c", mode: "classic" })
    );
    expect(payload.gameCode).toBe("ABCD");
  });

  it("rejects requests that do not include a bearer token", async () => {
    verifyFirebaseAuthHeaderMock.mockRejectedValueOnce(
      new FirebaseAuthUnauthenticatedError("Missing Firebase bearer token.")
    );

    const response = await POST(buildRequest());
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("UNAUTHENTICATED");
  });

  it("rejects requests with invalid bearer tokens", async () => {
    verifyFirebaseAuthHeaderMock.mockRejectedValueOnce(
      new FirebaseAuthUnauthenticatedError("Firebase ID token has invalid signature")
    );

    const response = await POST(buildRequest({ authorization: "Bearer token-invalid" }));
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("UNAUTHENTICATED");
  });
});
