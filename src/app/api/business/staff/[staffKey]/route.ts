import { NextResponse } from "next/server";

import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import { parseStaffKey } from "@/lib/business/staff-identity";
import { buildStaffReadModel } from "@/lib/business/staff-read-model";

export const runtime = "nodejs";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid] ?? null;
}

function parseRangeWindowMs(rangeRaw: string): number | null {
  const value = rangeRaw.trim().toLowerCase();
  if (value === "30d") return 30 * 24 * 60 * 60 * 1000;
  if (value === "90d") return 90 * 24 * 60 * 60 * 1000;
  if (value === "180d") return 180 * 24 * 60 * 60 * 1000;
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ staffKey: string }> }) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const { staffKey } = await params;
    const identityKey = parseStaffKey(staffKey);
    if (!identityKey) {
      return NextResponse.json({ code: "INVALID_STAFF_KEY", message: "Invalid staff identifier." }, { status: 400 });
    }

    const readModel = await buildStaffReadModel(uid);
    const summary = readModel.directory.find((entry) => entry.staffKey === staffKey);
    const observations = readModel.observationsByKey.get(identityKey) ?? [];
    if (!summary || observations.length === 0) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Staff profile not found." }, { status: 404 });
    }

    const history = [...observations]
      .sort((left, right) => {
        const leftMs = left.observedAt ? new Date(left.observedAt).getTime() : 0;
        const rightMs = right.observedAt ? new Date(right.observedAt).getTime() : 0;
        return rightMs - leftMs;
      })
      .map((row) => ({
        gameCode: row.gameCode,
        orgId: row.orgId,
        orgName: row.orgName,
        sessionName: row.sessionName,
        sessionStatus: row.sessionStatus,
        observedAt: row.observedAt,
        claimsSubmitted: row.claimsSubmitted,
        claimsConfirmed: row.claimsConfirmed,
        claimsDenied: row.claimsDenied,
        accuracyRatio: row.accuracyRatio,
        disputeRateRatio: row.disputeRateRatio,
        deaths: row.deaths,
      }));

    const url = new URL(request.url);
    const range = (url.searchParams.get("range") ?? "all").trim().toLowerCase();
    const rangeWindowMs = parseRangeWindowMs(range);
    const nowMs = Date.now();
    const rangeStartMs = rangeWindowMs != null ? nowMs - rangeWindowMs : null;

    const orgId = summary.orgId;
    const orgRows = readModel.directory.filter((entry) => entry.orgId === orgId);
    const orgAccuracyValues: number[] = [];
    const orgDisputeValues: number[] = [];
    const orgClaimsPerSessionValues: number[] = [];
    const orgClaimsSubmittedPerSessionValues: number[] = [];
    const orgClaimsDeniedPerSessionValues: number[] = [];
    const orgKdRatioValues: number[] = [];
    let sampleMembers = 0;

    for (const entry of orgRows) {
      const rows = (readModel.observationsByKey.get(entry.identityKey) ?? []).filter((row) => {
        if (rangeStartMs == null) return true;
        const observedMs = row.observedAt ? new Date(row.observedAt).getTime() : Number.NaN;
        return Number.isFinite(observedMs) && observedMs >= rangeStartMs;
      });
      if (rows.length === 0) continue;
      sampleMembers += 1;
      const accuracyValues = rows
        .map((row) => row.accuracyRatio)
        .filter((value): value is number => value != null && Number.isFinite(value));
      const disputeValues = rows
        .map((row) => row.disputeRateRatio)
        .filter((value): value is number => value != null && Number.isFinite(value));
      const claimsPerSession = rows.reduce((sum, row) => sum + Math.max(0, row.claimsConfirmed), 0) / rows.length;
      const claimsSubmittedPerSession = rows.reduce((sum, row) => sum + Math.max(0, row.claimsSubmitted), 0) / rows.length;
      const claimsDeniedPerSession = rows.reduce((sum, row) => sum + Math.max(0, row.claimsDenied), 0) / rows.length;
      const confirmed = rows.reduce((sum, row) => sum + Math.max(0, row.claimsConfirmed), 0);
      const deaths = rows.reduce((sum, row) => sum + Math.max(0, row.deaths), 0);
      const kdRatio = deaths > 0 ? confirmed / deaths : confirmed;

      if (accuracyValues.length > 0) {
        orgAccuracyValues.push(accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length);
      }
      if (disputeValues.length > 0) {
        orgDisputeValues.push(disputeValues.reduce((sum, value) => sum + value, 0) / disputeValues.length);
      }
      if (Number.isFinite(claimsPerSession)) {
        orgClaimsPerSessionValues.push(claimsPerSession);
      }
      if (Number.isFinite(claimsSubmittedPerSession)) {
        orgClaimsSubmittedPerSessionValues.push(claimsSubmittedPerSession);
      }
      if (Number.isFinite(claimsDeniedPerSession)) {
        orgClaimsDeniedPerSessionValues.push(claimsDeniedPerSession);
      }
      if (Number.isFinite(kdRatio)) {
        orgKdRatioValues.push(kdRatio);
      }
    }

    const chronological = [...history].reverse();
    return NextResponse.json({
      contract: {
        name: "business-staff-detail",
        version: "2026-03-28.v1",
        compatibility: {
          longitudinalSeparatedFromSessionView: true,
          conservativeIdentityMerge: true,
        },
      },
      summary,
      series: {
        accuracy: chronological.map((row, index) => ({ index: index + 1, gameCode: row.gameCode, value: row.accuracyRatio })),
        claimsConfirmed: chronological.map((row, index) => ({ index: index + 1, gameCode: row.gameCode, value: row.claimsConfirmed })),
        disputeRate: chronological.map((row, index) => ({ index: index + 1, gameCode: row.gameCode, value: row.disputeRateRatio })),
      },
      cohort: {
        orgId,
        orgName: summary.orgName ?? null,
        sampleMembers,
        range: rangeWindowMs == null ? "all" : range,
        medianAccuracyRatio: median(orgAccuracyValues),
        medianDisputeRateRatio: median(orgDisputeValues),
        medianClaimsConfirmedPerSession: median(orgClaimsPerSessionValues),
        medianClaimsSubmittedPerSession: median(orgClaimsSubmittedPerSessionValues),
        medianClaimsDeniedPerSession: median(orgClaimsDeniedPerSessionValues),
        medianKdRatio: median(orgKdRatioValues),
      },
      sessionHistory: history,
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before loading staff detail." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[business:staff:detail] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load staff detail." }, { status: 500 });
  }
}
