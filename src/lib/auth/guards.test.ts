import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserMock, adminDbMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  adminDbMock: {
    collection: vi.fn(),
  },
}));

function createDocSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: data !== null,
    data: () => data ?? undefined,
  };
}

type DbFixture = Record<string, Record<string, unknown> | null>;

function createAdminDbMock(fixture: DbFixture) {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => createDocSnapshot(fixture[`${name}/${id}`] ?? null),
        collection: (subName: string) => ({
          doc: (subId: string) => ({
            get: async () => createDocSnapshot(fixture[`${name}/${id}/${subName}/${subId}`] ?? null),
          }),
        }),
      }),
    }),
  };
}

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: adminDbMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/getCurrentUser", () => ({
  getCurrentUser: getCurrentUserMock,
  CurrentUserUnauthenticatedError: class CurrentUserUnauthenticatedError extends Error {},
  CurrentUserInfrastructureError: class CurrentUserInfrastructureError extends Error {},
}));

import {
  GuardForbiddenError,
  assertManagerRouteAccess,
  assertOrgRouteAccess,
} from "@/lib/auth/guards";

describe("route access guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks /manager/[gameCode] when user is not an org owner or manager", async () => {
    getCurrentUserMock.mockResolvedValue({ uid: "non-member" });

    Object.assign(adminDbMock, createAdminDbMock({
      "games/GAME01": { orgId: "org-123" },
      "orgs/org-123": { ownerAccountId: "owner-uid" },
      "orgs/org-123/managers/non-member": null,
      "organizations/org-123": null,
    }));

    await expect(
      assertManagerRouteAccess({
        authorizationHeader: "Bearer token",
        gameCode: "GAME01",
      })
    ).rejects.toMatchObject<Partial<GuardForbiddenError>>({ code: "ORG_MEMBERSHIP_REQUIRED" });
  });

  it("blocks /org/[orgId] when user is not an org owner or manager", async () => {
    getCurrentUserMock.mockResolvedValue({ uid: "outside-user" });

    Object.assign(adminDbMock, createAdminDbMock({
      "orgs/org-123": { ownerAccountId: "owner-uid", name: "Acme" },
      "orgs/org-123/managers/outside-user": null,
      "organizations/org-123": null,
    }));

    await expect(
      assertOrgRouteAccess({
        authorizationHeader: "Bearer token",
        orgId: "org-123",
      })
    ).rejects.toMatchObject<Partial<GuardForbiddenError>>({ code: "ORG_ACCESS_REQUIRED" });
  });

  it("allows an org manager to access both /manager/[gameCode] and /org/[orgId]", async () => {
    getCurrentUserMock.mockResolvedValue({ uid: "manager-uid" });

    Object.assign(adminDbMock, createAdminDbMock({
      "games/GAME01": { orgId: "org-123" },
      "orgs/org-123": { ownerAccountId: "owner-uid", name: "Acme", tier: "enterprise" },
      "orgs/org-123/managers/manager-uid": { uid: "manager-uid", status: "active" },
      "organizations/org-123": null,
    }));

    await expect(
      assertManagerRouteAccess({
        authorizationHeader: "Bearer token",
        gameCode: "GAME01",
      })
    ).resolves.toMatchObject({
      uid: "manager-uid",
      gameCode: "GAME01",
      orgId: "org-123",
      ownershipSource: "orgs.managers",
    });

    await expect(
      assertOrgRouteAccess({
        authorizationHeader: "Bearer token",
        orgId: "org-123",
      })
    ).resolves.toMatchObject({
      uid: "manager-uid",
      orgId: "org-123",
      orgName: "Acme",
      ownershipSource: "orgs.managers",
    });
  });
});
