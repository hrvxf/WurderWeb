import { NextResponse } from "next/server";

import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";

export const runtime = "nodejs";

type StaffExportPayload = {
  directory?: Array<{
    staffKey?: string;
    displayName?: string;
    orgId?: string;
    orgName?: string | null;
    sessionsPlayed?: number;
    latestAccuracyRatio?: number | null;
    trendIndicator?: string;
    identityConfidence?: string;
    identityNeedsReview?: boolean;
    identitySource?: string;
    latestObservedAt?: string | null;
    latestSessionName?: string | null;
    avgDisputeRateRatio?: number | null;
  }>;
  message?: string;
};

function toCsvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values: Array<string | number | boolean | null | undefined>): string {
  return values.map((value) => toCsvCell(value)).join(",");
}

function toPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return `${Math.round(value * 100)}%`;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    await verifyFirebaseAuthHeader(authHeader);

    const url = new URL(request.url);
    const origin = url.origin;
    const sourceQuery = url.searchParams.toString();
    const sourceUrl = `${origin}/api/business/staff${sourceQuery ? `?${sourceQuery}` : ""}`;
    const sourceResponse = await fetch(sourceUrl, {
      headers: authHeader ? { authorization: authHeader } : undefined,
      cache: "no-store",
    });
    const payload = (await sourceResponse.json().catch(() => ({}))) as StaffExportPayload;

    if (!sourceResponse.ok) {
      return NextResponse.json(
        {
          code: "STAFF_EXPORT_SOURCE_FAILED",
          message: payload.message ?? "Unable to load staff data for export.",
        },
        { status: sourceResponse.status }
      );
    }

    const rows = Array.isArray(payload.directory) ? payload.directory : [];
    const lines: string[] = [];
    lines.push(
      csvRow([
        "Staff Key",
        "Display Name",
        "Organisation ID",
        "Organisation Name",
        "Sessions Played",
        "Latest Accuracy",
        "Average Dispute Rate",
        "Trend",
        "Latest Session",
        "Latest Observed At",
        "Identity Source",
        "Identity Confidence",
        "Identity Needs Review",
      ])
    );

    for (const row of rows) {
      lines.push(
        csvRow([
          row.staffKey ?? "",
          row.displayName ?? "",
          row.orgId ?? "",
          row.orgName ?? "",
          row.sessionsPlayed ?? 0,
          toPercent(row.latestAccuracyRatio),
          toPercent(row.avgDisputeRateRatio),
          row.trendIndicator ?? "",
          row.latestSessionName ?? "",
          row.latestObservedAt ?? "",
          row.identitySource ?? "",
          row.identityConfidence ?? "",
          row.identityNeedsReview ?? false,
        ])
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="staff-stats.csv"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before exporting staff stats." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[business:staff:export] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to export staff stats." }, { status: 500 });
  }
}

