import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HandoffSetupConfig } from "@/domain/handoff/setup-draft";
import { createHandoffSetupDraftDoc } from "@/domain/handoff/setup-draft";
import { POST } from "@/app/api/handoff/setups/route";
import { createHandoffSetupDraft } from "@/lib/handoff/setup-drafts";
import { verifyFirebaseAuthHeader } from "@/lib/auth/verify-firebase-auth-header";
import { assertOrganizationOwner, findOrganizationTemplateById } from "@/lib/game/company-config";

vi.mock("@/lib/handoff/setup-drafts", () => ({
  createHandoffSetupDraft: vi.fn(),
}));
vi.mock("@/lib/auth/verify-firebase-auth-header", () => ({
  verifyFirebaseAuthHeader: vi.fn(),
}));
vi.mock("@/lib/game/company-config", () => ({
  assertOrganizationOwner: vi.fn(),
  findOrganizationTemplateById: vi.fn(),
}));

const createHandoffSetupDraftMock = vi.mocked(createHandoffSetupDraft);
const verifyFirebaseAuthHeaderMock = vi.mocked(verifyFirebaseAuthHeader);
const assertOrganizationOwnerMock = vi.mocked(assertOrganizationOwner);
const findOrganizationTemplateByIdMock = vi.mocked(findOrganizationTemplateById);

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/handoff/setups", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/handoff/setups", () => {
  beforeEach(() => {
    createHandoffSetupDraftMock.mockReset();
    verifyFirebaseAuthHeaderMock.mockReset();
    assertOrganizationOwnerMock.mockReset();
    findOrganizationTemplateByIdMock.mockReset();

    verifyFirebaseAuthHeaderMock.mockResolvedValue("uid-test");
    assertOrganizationOwnerMock.mockResolvedValue({ tier: "enterprise" });
    findOrganizationTemplateByIdMock.mockResolvedValue(null);
    createHandoffSetupDraftMock.mockImplementation(async ({ config }: { config: HandoffSetupConfig }) => ({
      setupId: "ABCD234EFG",
      draft: createHandoffSetupDraftDoc({
        config,
        createdByAccountId: null,
        nowMs: 1_000,
      }),
    }));
  });

  it("creates b2c setup draft without auth validation", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2c",
        mode: "classic",
      })
    );

    expect(response.status).toBe(201);
    expect(verifyFirebaseAuthHeaderMock).not.toHaveBeenCalled();
    expect(assertOrganizationOwnerMock).not.toHaveBeenCalled();
  });

  it("creates b2b setup draft with org ownership checks", async () => {
    const response = await POST(
      buildRequest({
        gameType: "b2b",
        mode: "classic",
        orgId: "org-1",
        templateId: "tpl-1",
        sessionType: "player",
      })
    );
    const payload = (await response.json()) as { config?: unknown };

    expect(response.status).toBe(404);
    expect(verifyFirebaseAuthHeaderMock).toHaveBeenCalled();
    expect(assertOrganizationOwnerMock).toHaveBeenCalledWith({ orgId: "org-1", ownerAccountId: "uid-test" });
    expect(findOrganizationTemplateByIdMock).toHaveBeenCalledWith({ orgId: "org-1", templateId: "tpl-1" });
    expect(payload.config).toBeUndefined();
  });
});
