import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import {
  assertOrgAccess,
  OrgAccessInfrastructureError,
  OrgForbiddenError,
  OrgNotFoundError,
  OrgUnauthenticatedError,
} from "@/lib/org/access";

export const runtime = "nodejs";

type DeleteBody = {
  confirmText?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function canDeleteOrg(ownershipSource: string): boolean {
  return ownershipSource === "orgs.ownerAccountId" || ownershipSource === "organizations.ownerAccountId";
}

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const access = await assertOrgAccess(request.headers.get("authorization"), orgId);
    const [canonicalOrg, legacyOrg] = await Promise.all([
      adminDb.collection("orgs").doc(access.orgId).get(),
      adminDb.collection("organizations").doc(access.orgId).get(),
    ]);
    const source = canonicalOrg.exists ? canonicalOrg : legacyOrg;
    const sourceData = (source.data() ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      org: {
        orgId: access.orgId,
        name: asNonEmptyString(sourceData.name) ?? access.orgName,
        ownershipSource: access.ownershipSource,
      },
      permissions: {
        canDelete: canDeleteOrg(access.ownershipSource),
      },
    });
  } catch (error) {
    if (error instanceof OrgUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before accessing this organization." }, { status: 401 });
    }
    if (error instanceof OrgForbiddenError) {
      return NextResponse.json({ code: "FORBIDDEN", message: "This account cannot access this organization." }, { status: 403 });
    }
    if (error instanceof OrgNotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Organization not found." }, { status: 404 });
    }
    if (error instanceof OrgAccessInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[org] GET failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load organization settings." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const access = await assertOrgAccess(request.headers.get("authorization"), orgId);
    if (!canDeleteOrg(access.ownershipSource)) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Only the organisation owner can delete this organisation.",
        },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as DeleteBody;
    const confirmText = asNonEmptyString(body.confirmText);
    if (confirmText !== "DELETE") {
      return NextResponse.json(
        {
          code: "CONFIRMATION_REQUIRED",
          message: 'Deletion requires confirmText="DELETE".',
        },
        { status: 400 }
      );
    }

    const canonicalRef = adminDb.collection("orgs").doc(access.orgId);
    const legacyRef = adminDb.collection("organizations").doc(access.orgId);
    const orgAnalyticsRef = adminDb.collection("orgAnalytics").doc(access.orgId);

    const [canonicalSnap, legacySnap, orgAnalyticsSnap] = await Promise.all([
      canonicalRef.get(),
      legacyRef.get(),
      orgAnalyticsRef.get(),
    ]);

    const deletions: Promise<unknown>[] = [];
    if (canonicalSnap.exists) deletions.push(adminDb.recursiveDelete(canonicalRef));
    if (legacySnap.exists) deletions.push(adminDb.recursiveDelete(legacyRef));
    if (orgAnalyticsSnap.exists) deletions.push(adminDb.recursiveDelete(orgAnalyticsRef));

    await Promise.all(deletions);

    return NextResponse.json({
      ok: true,
      orgId: access.orgId,
      deleted: {
        orgsDoc: canonicalSnap.exists,
        organizationsDoc: legacySnap.exists,
        orgAnalyticsDoc: orgAnalyticsSnap.exists,
      },
    });
  } catch (error) {
    if (error instanceof OrgUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before accessing this organization." }, { status: 401 });
    }
    if (error instanceof OrgForbiddenError) {
      return NextResponse.json({ code: "FORBIDDEN", message: "This account cannot access this organization." }, { status: 403 });
    }
    if (error instanceof OrgNotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Organization not found." }, { status: 404 });
    }
    if (error instanceof OrgAccessInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[org] DELETE failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to delete organization." }, { status: 500 });
  }
}
