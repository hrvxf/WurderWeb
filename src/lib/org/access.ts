import "server-only";

import {
  assertOrgRouteAccess,
  GuardAuthInfrastructureError,
  GuardForbiddenError,
  GuardNotFoundError,
  GuardUnauthenticatedError,
  type OrgGuardOwnershipSource,
} from "@/lib/auth/guards";
import type { ProductTier } from "@/lib/product/entitlements";

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

export type OrgOwnershipSource = OrgGuardOwnershipSource;

export type OrgAccessResult = {
  uid: string;
  orgId: string;
  orgName: string | null;
  tier: ProductTier;
  ownershipSource: OrgOwnershipSource;
};

export async function assertOrgAccess(
  authorizationHeader: string | null,
  orgId: string
): Promise<OrgAccessResult> {
  try {
    const access = await assertOrgRouteAccess({ authorizationHeader, orgId });
    return {
      uid: access.uid,
      orgId: access.orgId,
      orgName: access.orgName,
      tier: access.tier,
      ownershipSource: access.ownershipSource,
    };
  } catch (error) {
    if (error instanceof GuardUnauthenticatedError) {
      throw new OrgUnauthenticatedError(error.message);
    }
    if (error instanceof GuardAuthInfrastructureError) {
      throw new OrgAccessInfrastructureError(error.message);
    }

    if (error instanceof GuardNotFoundError && error.code === "ORG_NOT_FOUND") {
      throw new OrgNotFoundError(error.message);
    }

    if (error instanceof GuardForbiddenError) {
      throw new OrgForbiddenError(error.message);
    }

    throw error;
  }
}
