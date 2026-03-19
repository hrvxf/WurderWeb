import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { normalizeProductTier, type ProductTier } from "@/lib/product/entitlements";
import {
  CreateGameAuthInfrastructureError,
  UnauthenticatedCreateGameError,
  verifyFirebaseAuthHeader,
} from "@/lib/game/create-game";

type OrgDoc = {
  name?: unknown;
  ownerAccountId?: unknown;
  tier?: unknown;
};

type OrgManagerDoc = {
  uid?: unknown;
  role?: unknown;
  status?: unknown;
};

export class OrgUnauthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "OrgUnauthenticatedError";
  }
}

export class OrgForbiddenError extends Error {
  constructor(message = "You are not authorized to view this organization.") {
    super(message);
    this.name = "OrgForbiddenError";
  }
}

export class OrgNotFoundError extends Error {
  constructor(message = "Organization not found.") {
    super(message);
    this.name = "OrgNotFoundError";
  }
}

export class OrgAccessInfrastructureError extends Error {
  constructor(message = "Unable to verify Firebase auth token on server.") {
    super(message);
    this.name = "OrgAccessInfrastructureError";
  }
}

export type OrgOwnershipSource =
  | "orgs.ownerAccountId"
  | "orgs.managers"
  | "organizations.ownerAccountId"
  | "organizations.managers";

export type OrgAccessResult = {
  uid: string;
  orgId: string;
  orgName: string | null;
  tier: ProductTier;
  ownershipSource: OrgOwnershipSource;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function managerIsActive(record: OrgManagerDoc, uid: string): boolean {
  const managerUid = asNonEmptyString(record.uid);
  const status = (asNonEmptyString(record.status) ?? "active").toLowerCase();
  if (!managerUid || managerUid !== uid) return false;
  return status !== "disabled";
}

async function evaluateOrgAccessFromCollection(
  collectionName: "orgs" | "organizations",
  orgId: string,
  uid: string
): Promise<{ orgName: string | null; tier: ProductTier; source: OrgOwnershipSource } | null> {
  const orgRef = adminDb.collection(collectionName).doc(orgId);
  const orgDoc = await orgRef.get();
  if (!orgDoc.exists) return null;

  const data = (orgDoc.data() ?? {}) as OrgDoc;
  const orgName = asNonEmptyString(data.name);
  const ownerAccountId = asNonEmptyString(data.ownerAccountId);
  if (ownerAccountId && ownerAccountId === uid) {
    return {
      orgName,
      tier: normalizeProductTier(data.tier),
      source: collectionName === "orgs" ? "orgs.ownerAccountId" : "organizations.ownerAccountId",
    };
  }

  const membershipDoc = await orgRef.collection("managers").doc(uid).get();
  if (membershipDoc.exists && managerIsActive((membershipDoc.data() ?? {}) as OrgManagerDoc, uid)) {
    return {
      orgName,
      tier: normalizeProductTier(data.tier),
      source: collectionName === "orgs" ? "orgs.managers" : "organizations.managers",
    };
  }

  return null;
}

export async function assertOrgAccess(
  authorizationHeader: string | null,
  orgId: string
): Promise<OrgAccessResult> {
  let uid: string;
  try {
    uid = await verifyFirebaseAuthHeader(authorizationHeader);
  } catch (error) {
    if (error instanceof UnauthenticatedCreateGameError) {
      throw new OrgUnauthenticatedError(error.message);
    }
    if (error instanceof CreateGameAuthInfrastructureError) {
      throw new OrgAccessInfrastructureError(error.message);
    }
    throw error;
  }

  const normalizedOrgId = orgId.trim();
  if (!normalizedOrgId) throw new OrgNotFoundError();

  const canonical = await evaluateOrgAccessFromCollection("orgs", normalizedOrgId, uid);
  if (canonical) {
    return {
      uid,
      orgId: normalizedOrgId,
      orgName: canonical.orgName,
      tier: canonical.tier,
      ownershipSource: canonical.source,
    };
  }

  const legacy = await evaluateOrgAccessFromCollection("organizations", normalizedOrgId, uid);
  if (legacy) {
    return {
      uid,
      orgId: normalizedOrgId,
      orgName: legacy.orgName,
      tier: legacy.tier,
      ownershipSource: legacy.source,
    };
  }

  const [canonicalOrgExists, legacyOrgExists] = await Promise.all([
    adminDb.collection("orgs").doc(normalizedOrgId).get(),
    adminDb.collection("organizations").doc(normalizedOrgId).get(),
  ]);

  if (!canonicalOrgExists.exists && !legacyOrgExists.exists) {
    throw new OrgNotFoundError();
  }

  throw new OrgForbiddenError();
}
