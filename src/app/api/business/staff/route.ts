import { NextResponse } from "next/server";

import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import { buildStaffReadModel } from "@/lib/business/staff-read-model";

export const runtime = "nodejs";

type PerformanceSegment = "all" | "high_performer" | "improving" | "declining" | "at_risk" | "low_confidence";

function asQueryValue(params: URLSearchParams, key: string): string {
  return params.get(key)?.trim() ?? "";
}

function parseDateBoundary(value: string, boundary: "start" | "end"): number | null {
  if (!value) return null;
  const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  const parsed = new Date(`${value}${value.includes("T") ? "" : suffix}`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function trendFromSeries(values: Array<number | null>): "up" | "down" | "flat" | "unknown" {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (valid.length < 2) return "unknown";
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (last - first > 0.03) return "up";
  if (first - last > 0.03) return "down";
  return "flat";
}

function matchesSegment(input: {
  segment: PerformanceSegment;
  identityNeedsReview: boolean;
  identityConfidence: "high" | "medium" | "low";
  latestAccuracyRatio: number | null;
  avgDisputeRateRatio: number | null;
  trendIndicator: "up" | "down" | "flat" | "unknown";
  sessionsPlayed: number;
}): boolean {
  if (input.segment === "all") return true;
  if (input.segment === "low_confidence") {
    return input.identityNeedsReview || input.identityConfidence === "low";
  }
  if (input.segment === "improving") return input.trendIndicator === "up";
  if (input.segment === "declining") return input.trendIndicator === "down";
  if (input.segment === "high_performer") {
    return (
      (input.latestAccuracyRatio ?? 0) >= 0.75 &&
      (input.avgDisputeRateRatio ?? 0) <= 0.2 &&
      input.sessionsPlayed >= 2
    );
  }
  if (input.segment === "at_risk") {
    return (input.latestAccuracyRatio ?? 1) < 0.5 || (input.avgDisputeRateRatio ?? 0) >= 0.35;
  }
  return true;
}

export async function GET(request: Request) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const readModel = await buildStaffReadModel(uid);
    const url = new URL(request.url);
    const sessionFilter = asQueryValue(url.searchParams, "session").toLowerCase();
    const unitFilter = asQueryValue(url.searchParams, "unit").toLowerCase();
    const dateFromMs = parseDateBoundary(asQueryValue(url.searchParams, "from"), "start");
    const dateToMs = parseDateBoundary(asQueryValue(url.searchParams, "to"), "end");
    const segmentRaw = asQueryValue(url.searchParams, "segment").toLowerCase();
    const segment: PerformanceSegment = (
      ["all", "high_performer", "improving", "declining", "at_risk", "low_confidence"].includes(segmentRaw)
        ? segmentRaw
        : "all"
    ) as PerformanceSegment;

    const filtered = readModel.directory
      .map((row) => {
        const observations = [...(readModel.observationsByKey.get(row.identityKey) ?? [])]
          .sort((left, right) => {
            const leftMs = left.observedAt ? new Date(left.observedAt).getTime() : 0;
            const rightMs = right.observedAt ? new Date(right.observedAt).getTime() : 0;
            return rightMs - leftMs;
          })
          .filter((obs) => {
            if (sessionFilter) {
              const haystack = `${obs.sessionName} ${obs.gameCode}`.toLowerCase();
              if (!haystack.includes(sessionFilter)) return false;
            }
            if (unitFilter) {
              const haystack = `${obs.orgName ?? ""} ${obs.orgId} ${obs.sessionName}`.toLowerCase();
              if (!haystack.includes(unitFilter)) return false;
            }
            if (dateFromMs != null || dateToMs != null) {
              const observedMs = obs.observedAt ? new Date(obs.observedAt).getTime() : Number.NaN;
              if (!Number.isFinite(observedMs)) return false;
              if (dateFromMs != null && observedMs < dateFromMs) return false;
              if (dateToMs != null && observedMs > dateToMs) return false;
            }
            return true;
          });

        if (observations.length === 0) return null;

        const latest = observations[0];
        const trend = trendFromSeries([...observations].reverse().map((obs) => obs.accuracyRatio));
        const disputeValues = observations
          .map((obs) => obs.disputeRateRatio)
          .filter((value): value is number => value != null && Number.isFinite(value));
        const avgDispute =
          disputeValues.length > 0
            ? disputeValues.reduce((sum, value) => sum + value, 0) / disputeValues.length
            : null;

        if (
          !matchesSegment({
            segment,
            identityNeedsReview: row.identityNeedsReview,
            identityConfidence: row.identityConfidence,
            latestAccuracyRatio: latest.accuracyRatio,
            avgDisputeRateRatio: avgDispute,
            trendIndicator: trend,
            sessionsPlayed: observations.length,
          })
        ) {
          return null;
        }

        return {
          ...row,
          sessionsPlayed: observations.length,
          latestAccuracyRatio: latest.accuracyRatio,
          trendIndicator: trend,
          latestObservedAt: latest.observedAt,
          latestSessionName: latest.sessionName,
          avgDisputeRateRatio: avgDispute,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    return NextResponse.json({
      contract: {
        name: "business-staff-directory",
        version: "2026-03-28.v2",
        compatibility: {
          longitudinalSeparatedFromSessionView: true,
          conservativeIdentityMerge: true,
          filters: ["session", "from", "to", "unit", "segment"],
        },
      },
      filters: {
        session: sessionFilter,
        unit: unitFilter,
        from: asQueryValue(url.searchParams, "from"),
        to: asQueryValue(url.searchParams, "to"),
        segment,
      },
      directory: filtered,
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before loading staff analytics." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[business:staff] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load staff analytics." }, { status: 500 });
  }
}
