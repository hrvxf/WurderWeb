import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  CurrentUserInfrastructureError,
  CurrentUserUnauthenticatedError,
  getCurrentUser,
} from "@/lib/auth/getCurrentUser";
import { normalizeProductTier, type ProductTier } from "@/lib/product/entitlements";

type OrgDoc = {
  name?: unknown;
  ownerAccountId?: unknown;
  tier?: unknown;
};

type OrgManagerDoc = {
  uid?: unknown;
  status?: unknown;
};

type GameDoc = {
  createdByAccountId?: unknown;
  managerAccountId?: unknown;
  orgId?: unknown;
};

export type ManagerGuardOwnershipSource =
  | "game.createdByAccountId"
  | "game.managerAccountId"
  | "orgs.ownerAccountId"
  | "orgs.managers"
  | "organizations.ownerAccountId"
  | "organizations.managers";

export type OrgGuardOwnershipSource =
  | "orgs.ownerAccountId"
  | "orgs.managers"
  | "organizations.ownerAccountId"
  | "organizations.managers";

export class GuardUnauthenticatedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "GuardUnauthenticatedError";
  }
}

export class GuardAuthInfrastructureError extends Error {
  constructor(message = "Unable to verify Firebase auth token on server.") {
    super(message);
    this.name = "GuardAuthInfrastructureError";
  }
}

export class GuardNotFoundError extends Error {
  code: "GAME_NOT_FOUND" | "ORG_NOT_FOUND";

  constructor(code: "GAME_NOT_FOUND" | "ORG_NOT_FOUND", message: string) {
    super(message);
    this.name = "GuardNotFoundError";
    this.code = code;
  }
}

export class GuardForbiddenError extends Error {
  code:
    | "ORG_MEMBERSHIP_REQUIRED"
    | "GAME_NOT_LINKED_TO_ORG"
    | "ORG_ACCESS_REQUIRED";

  constructor(
    code:
      | "ORG_MEMBERSHIP_REQUIRED"
      | "GAME_NOT_LINKED_TO_ORG"
      | "ORG_ACCESS_REQUIRED",
    message: string
  ) {
    super(message);
    this.name = "GuardForbiddenError";
    this.code = code;
  }
}

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

export async function fetchUser(uid: string): Promise<{
  uid: string;
  userProfile: Record<string, unknown> | null;
  accountProfile: Record<string, unknown> | null;
}> {
  const [userDoc, accountDoc] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("accounts").doc(uid).get(),
  ]);

  return {
    uid,
    userProfile: userDoc.exists ? ((userDoc.data() ?? {}) as Record<string, unknown>) : null,
    accountProfile: accountDoc.exists ? ((accountDoc.data() ?? {}) as Record<string, unknown>) : null,
  };
}

export async function fetchGame(gameCode: string): Promise<{
  exists: boolean;
  gameCode: string;
  createdByAccountId: string | null;
  managerAccountId: string | null;
  orgId: string | null;
}> {
  const normalizedCode = gameCode.trim();
  const gameDoc = await adminDb.collection("games").doc(normalizedCode).get();
  const data = (gameDoc.data() ?? {}) as GameDoc;

  return {
    exists: gameDoc.exists,
    gameCode: normalizedCode,
    createdByAccountId: asNonEmptyString(data.createdByAccountId),
    managerAccountId: asNonEmptyString(data.managerAccountId),
    orgId: asNonEmptyString(data.orgId),
  };
}

export async function fetchOrg(orgId: string): Promise<{
  exists: boolean;
  orgId: string;
  name: string | null;
  ownerAccountId: string | null;
  tier: ProductTier;
  source: "orgs" | "organizations" | null;
}> {
  const normalizedOrgId = orgId.trim();
  const [canonicalOrgDoc, legacyOrgDoc] = await Promise.all([
    adminDb.collection("orgs").doc(normalizedOrgId).get(),
    adminDb.collection("organizations").doc(normalizedOrgId).get(),
  ]);

  if (!canonicalOrgDoc.exists && !legacyOrgDoc.exists) {
    return {
      exists: false,
      orgId: normalizedOrgId,
      name: null,
      ownerAccountId: null,
      tier: "basic",
      source: null,
    };
  }

  const sourceDoc = canonicalOrgDoc.exists ? canonicalOrgDoc : legacyOrgDoc;
  const sourceData = (sourceDoc.data() ?? {}) as OrgDoc;

  return {
    exists: true,
    orgId: normalizedOrgId,
    name: asNonEmptyString(sourceData.name),
    ownerAccountId: asNonEmptyString(sourceData.ownerAccountId),
    tier: normalizeProductTier(sourceData.tier),
    source: canonicalOrgDoc.exists ? "orgs" : "organizations",
  };
}

async function evaluateOrgMembership(
  uid: string,
  orgId: string
): Promise<{ allowed: true; source: OrgGuardOwnershipSource } | { allowed: false }> {
  const [canonicalOrgDoc, legacyOrgDoc] = await Promise.all([
    adminDb.collection("orgs").doc(orgId).get(),
    adminDb.collection("organizations").doc(orgId).get(),
  ]);

  if (canonicalOrgDoc.exists) {
    const canonicalOrgData = (canonicalOrgDoc.data() ?? {}) as OrgDoc;
    const ownerAccountId = asNonEmptyString(canonicalOrgData.ownerAccountId);
    if (ownerAccountId && ownerAccountId === uid) {
      return { allowed: true, source: "orgs.ownerAccountId" };
    }

    const membershipDoc = await adminDb.collection("orgs").doc(orgId).collection("managers").doc(uid).get();
    if (membershipDoc.exists && managerIsActive((membershipDoc.data() ?? {}) as OrgManagerDoc, uid)) {
      return { allowed: true, source: "orgs.managers" };
    }
  }

  if (legacyOrgDoc.exists) {
    const legacyOrgData = (legacyOrgDoc.data() ?? {}) as OrgDoc;
    const ownerAccountId = asNonEmptyString(legacyOrgData.ownerAccountId);
    if (ownerAccountId && ownerAccountId === uid) {
      return { allowed: true, source: "organizations.ownerAccountId" };
    }

    const membershipDoc = await adminDb.collection("organizations").doc(orgId).collection("managers").doc(uid).get();
    if (membershipDoc.exists && managerIsActive((membershipDoc.data() ?? {}) as OrgManagerDoc, uid)) {
      return { allowed: true, source: "organizations.managers" };
    }
  }

  return { allowed: false };
}

export async function assertManagerRouteAccess(input: {
  authorizationHeader: string | null;
  gameCode: string;
}): Promise<{
  uid: string;
  gameCode: string;
  orgId: string;
  ownershipSource: ManagerGuardOwnershipSource;
}> {
  let uid: string;
  try {
    uid = (await getCurrentUser(input.authorizationHeader)).uid;
  } catch (error) {
    if (error instanceof CurrentUserUnauthenticatedError) {
      throw new GuardUnauthenticatedError(error.message);
    }
    if (error instanceof CurrentUserInfrastructureError) {
      throw new GuardAuthInfrastructureError(error.message);
    }
    throw error;
  }

  const game = await fetchGame(input.gameCode);
  if (!game.exists) {
    throw new GuardNotFoundError("GAME_NOT_FOUND", "Game not found.");
  }

  if (!game.orgId) {
    throw new GuardForbiddenError(
      "GAME_NOT_LINKED_TO_ORG",
      "This game is not linked to an organization and cannot be opened in manager dashboard."
    );
  }

  if (game.createdByAccountId && game.createdByAccountId === uid) {
    return {
      uid,
      gameCode: game.gameCode,
      orgId: game.orgId,
      ownershipSource: "game.createdByAccountId",
    };
  }

  if (game.managerAccountId && game.managerAccountId === uid) {
    return {
      uid,
      gameCode: game.gameCode,
      orgId: game.orgId,
      ownershipSource: "game.managerAccountId",
    };
  }

  const membership = await evaluateOrgMembership(uid, game.orgId);
  if (membership.allowed) {
    return {
      uid,
      gameCode: game.gameCode,
      orgId: game.orgId,
      ownershipSource: membership.source,
    };
  }

  throw new GuardForbiddenError(
    "ORG_MEMBERSHIP_REQUIRED",
    "This account is not authorized to manage this game."
  );
}

export async function assertOrgRouteAccess(input: {
  authorizationHeader: string | null;
  orgId: string;
}): Promise<{
  uid: string;
  orgId: string;
  orgName: string | null;
  tier: ProductTier;
  ownershipSource: OrgGuardOwnershipSource;
}> {
  let uid: string;
  try {
    uid = (await getCurrentUser(input.authorizationHeader)).uid;
  } catch (error) {
    if (error instanceof CurrentUserUnauthenticatedError) {
      throw new GuardUnauthenticatedError(error.message);
    }
    if (error instanceof CurrentUserInfrastructureError) {
      throw new GuardAuthInfrastructureError(error.message);
    }
    throw error;
  }

  const org = await fetchOrg(input.orgId);
  if (!org.orgId) {
    throw new GuardNotFoundError("ORG_NOT_FOUND", "Organization not found.");
  }

  if (!org.exists) {
    throw new GuardNotFoundError("ORG_NOT_FOUND", "Organization not found.");
  }

  const membership = await evaluateOrgMembership(uid, org.orgId);
  if (!membership.allowed) {
    throw new GuardForbiddenError(
      "ORG_ACCESS_REQUIRED",
      "This account cannot access this organization."
    );
  }

  return {
    uid,
    orgId: org.orgId,
    orgName: org.name,
    tier: org.tier,
    ownershipSource: membership.source,
  };
}
