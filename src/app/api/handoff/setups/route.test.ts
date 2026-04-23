import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HandoffSetupConfig } from "@/domain/handoff/setup-draft";
import { createHandoffSetupDraftDoc } from "@/domain/handoff/setup-draft";
import { createHandoffSetupDraft } from "@/lib/handoff/setup-drafts";
import { POST } from "@/app/api/handoff/setups/route";

vi.mock("@/lib/handoff/setup-drafts", () => ({
  createHandoffSetupDraft: vi.fn(),
}));

const createHandoffSetupDraftMock = vi.mocked(createHandoffSetupDraft);

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/handoff/setups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST /api/handoff/setups", () => {
  beforeEach(() => {
    createHandoffSetupDraftMock.mockReset();
    createHandoffSetupDraftMock.mockImplementation(async ({ config }: { config: HandoffSetupConfig }) => ({
      setupId: "ABCD234EFG",
      draft: createHandoffSetupDraftDoc({
        config,
        createdByAccountId: null,
        nowMs: 1_000,
      }),
    }));
  });

  it("defaults free_for_all variant to classic when omitted", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2c",
        mode: "free_for_all",
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(201);
    expect(payload.config).toEqual({
      gameType: "b2c",
      mode: "free_for_all",
      freeForAllVariant: "classic",
    });
    expect(createHandoffSetupDraftMock).toHaveBeenCalledWith({
      config: {
        gameType: "b2c",
        mode: "free_for_all",
        freeForAllVariant: "classic",
      },
    });
  });

  it("accepts free_for_all with explicit classic and survivor variants", async () => {
    const classicResponse = await POST(
      buildRequest({
        gameType: "b2b",
        mode: "free_for_all",
        freeForAllVariant: "classic",
      })
    );
    const classicPayload = await readJson(classicResponse);

    expect(classicResponse.status).toBe(201);
    expect(classicPayload.config).toEqual({
      gameType: "b2b",
      mode: "free_for_all",
      freeForAllVariant: "classic",
    });

    const survivorResponse = await POST(
      buildRequest({
        gameType: "b2b",
        mode: "free_for_all",
        freeForAllVariant: "survivor",
      })
    );
    const survivorPayload = await readJson(survivorResponse);

    expect(survivorResponse.status).toBe(201);
    expect(survivorPayload.config).toEqual({
      gameType: "b2b",
      mode: "free_for_all",
      freeForAllVariant: "survivor",
    });
  });

  it("rejects invalid free_for_all variant values", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2c",
        mode: "free_for_all",
        freeForAllVariant: "invalid",
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.code).toBe("INVALID_SETUP_CONFIG");
    expect(createHandoffSetupDraftMock).not.toHaveBeenCalled();
  });

  it("rejects non-ffa mode when freeForAllVariant is provided", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2c",
        mode: "classic",
        freeForAllVariant: "classic",
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.code).toBe("INVALID_SETUP_CONFIG");
    expect(createHandoffSetupDraftMock).not.toHaveBeenCalled();
  });

  it("accepts guilds mode with omitted guildWinCondition", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2c",
        mode: "guilds",
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(201);
    expect(payload.config).toEqual({
      gameType: "b2c",
      mode: "guilds",
    });
    expect(payload.config).not.toHaveProperty("guildWinCondition");
  });

  it("accepts guilds with explicit score and last_standing win conditions", async () => {
    const scoreResponse = await POST(
      buildRequest({
        gameType: "b2b",
        mode: "guilds",
        guildWinCondition: "score",
      })
    );
    const scorePayload = await readJson(scoreResponse);

    expect(scoreResponse.status).toBe(201);
    expect(scorePayload.config).toEqual({
      gameType: "b2b",
      mode: "guilds",
      guildWinCondition: "score",
    });

    const lastStandingResponse = await POST(
      buildRequest({
        gameType: "b2b",
        mode: "guilds",
        guildWinCondition: "last_standing",
      })
    );
    const lastStandingPayload = await readJson(lastStandingResponse);

    expect(lastStandingResponse.status).toBe(201);
    expect(lastStandingPayload.config).toEqual({
      gameType: "b2b",
      mode: "guilds",
      guildWinCondition: "last_standing",
    });
  });

  it("rejects non-guild mode when guildWinCondition is provided", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2c",
        mode: "classic",
        guildWinCondition: "score",
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload.code).toBe("INVALID_SETUP_CONFIG");
    expect(createHandoffSetupDraftMock).not.toHaveBeenCalled();
  });

  it("returns config in canonical handoff schema shape", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2c",
        mode: "classic",
      })
    );
    const payload = await readJson(response);

    expect(response.status).toBe(201);
    expect(payload.config).toEqual({
      gameType: "b2c",
      mode: "classic",
    });
    expect(payload.config).not.toHaveProperty("freeForAllVariant");
  });
});
