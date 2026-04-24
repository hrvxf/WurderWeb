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

function buildRequest(body: Record<string, unknown> = { mode: "classic" }, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/b2c/games", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/b2c/games", () => {
  beforeEach(() => {
    createGameForHostUidMock.mockReset();
    verifyFirebaseAuthHeaderMock.mockReset();

    verifyFirebaseAuthHeaderMock.mockResolvedValue("uid-host");
    createGameForHostUidMock.mockResolvedValue({
      gameCode: "ABCD",
    } as never);
  });

  it("creates a b2c game when provided a valid Firebase bearer token", async () => {
    const response = await POST(buildRequest({ mode: "classic" }, { authorization: "Bearer token-valid" }));
    const payload = (await response.json()) as {
      gameCode?: string;
      gameType?: string;
      joinPath?: string;
      deepLink?: string;
      universalLink?: string;
      metadata?: { createdFrom?: string; status?: string };
    };

    expect(response.status).toBe(201);
    expect(verifyFirebaseAuthHeaderMock).toHaveBeenCalledWith("Bearer token-valid");
    expect(createGameForHostUidMock).toHaveBeenCalledWith(
      expect.objectContaining({ hostUid: "uid-host", gameType: "b2c", mode: "classic" })
    );
    expect(payload.gameCode).toBe("ABCD");
    expect(payload.gameType).toBe("b2c");
    expect(payload.joinPath).toBe("/join/ABCD");
    expect(payload.deepLink).toBe("wurder://join/ABCD");
    expect(payload.universalLink).toBe("https://wurder.app/join/ABCD");
    expect(payload.metadata?.createdFrom).toBe("b2c_setup");
    expect(payload.metadata?.status).toBe("waiting");
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

    const response = await POST(buildRequest({ mode: "classic" }, { authorization: "Bearer token-invalid" }));
    const payload = (await response.json()) as { code?: string };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("UNAUTHENTICATED");
  });

  it("forwards free_for_all survivor variant to createGameForHostUid", async () => {
    const response = await POST(
      buildRequest(
        {
          mode: "free_for_all",
          freeForAllVariant: "survivor",
        },
        { authorization: "Bearer token-valid" }
      )
    );

    expect(response.status).toBe(201);
    expect(createGameForHostUidMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hostUid: "uid-host",
        gameType: "b2c",
        mode: "free_for_all",
        freeForAllVariant: "survivor",
      })
    );
  });

  it("rejects free_for_all requests without a variant", async () => {
    const response = await POST(
      buildRequest(
        {
          mode: "free_for_all",
        },
        { authorization: "Bearer token-valid" }
      )
    );
    const payload = (await response.json()) as { code?: string; message?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("INVALID_SETUP_CONFIG");
    expect(payload.message).toContain("freeForAllVariant");
    expect(createGameForHostUidMock).not.toHaveBeenCalled();
  });
});
