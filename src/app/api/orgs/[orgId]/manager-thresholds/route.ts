import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { resolveOrgKpiThresholds } from "@/lib/manager/dashboard-cache";
import {
  assertOrgAccess,
  OrgAccessInfrastructureError,
  OrgForbiddenError,
  OrgNotFoundError,
  OrgUnauthenticatedError,
} from "@/lib/org/access";

export const runtime = "nodejs";

function asRatio(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  }
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const access = await assertOrgAccess(request.headers.get("authorization"), orgId);
    const thresholds = await resolveOrgKpiThresholds(access.orgId);
    return NextResponse.json({ orgId: access.orgId, thresholds });
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
    console.error("[org:manager-thresholds:get] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load manager thresholds." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const access = await assertOrgAccess(request.headers.get("authorization"), orgId);
    const body = (await request.json().catch(() => ({}))) as {
      disputeRateWarningRatio?: unknown;
      disputeRateLabel?: unknown;
    };
    const ratio = asRatio(body.disputeRateWarningRatio);
    if (ratio == null) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "disputeRateWarningRatio must be a ratio between 0 and 1." },
        { status: 400 }
      );
    }

    const label = typeof body.disputeRateLabel === "string" ? body.disputeRateLabel.trim() : "";
    await adminDb.collection("orgs").doc(access.orgId).set(
      {
        managerDashboardConfig: {
          kpiThresholds: {
            disputeRateWarningRatio: ratio,
            disputeRateLabel: label.length > 0 ? label : "expected threshold",
          },
        },
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      orgId: access.orgId,
      thresholds: {
        disputeRateWarningRatio: ratio,
        disputeRateLabel: label.length > 0 ? label : "expected threshold",
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
    console.error("[org:manager-thresholds:put] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to update manager thresholds." }, { status: 500 });
  }
}
