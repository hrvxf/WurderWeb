import { NextResponse } from "next/server";

import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";

export const runtime = "nodejs";

type SessionExportPayload = {
  org?: {
    orgId?: string;
    name?: string | null;
  };
  session?: {
    sessionGroupId?: string;
    derivedName?: string;
    status?: string;
    sessionType?: string;
    identitySource?: string;
    identityConfidence?: string;
    identityNeedsReview?: boolean;
    gameCount?: number;
    createdAt?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    summary?: {
      playerCount?: number;
      startAt?: string | null;
      endAt?: string | null;
    };
    health?: {
      joinRate?: number | null;
      completionRate?: number | null;
      dropOffRate?: number | null;
      status?: string;
    };
    insights?: Array<{
      title?: string;
      summary?: string;
      severity?: string;
    }>;
    alerts?: Array<{
      title?: string;
      message?: string;
      level?: string;
    }>;
    games?: Array<{
      gameCode?: string;
      createdAt?: string | null;
      startedAt?: string | null;
      endedAt?: string | null;
    }>;
    players?: Array<{
      playerId?: string;
      displayName?: string;
      primaryGameCode?: string;
      claimsAttempted?: number;
      claimsConfirmed?: number;
      claimsDenied?: number;
      accuracyRatio?: number | null;
      survivalRatio?: number | null;
      deaths?: number;
      disputeRateRatio?: number | null;
    }>;
  };
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

export async function GET(request: Request, { params }: { params: Promise<{ sessionGroupId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    await verifyFirebaseAuthHeader(authHeader);

    const { sessionGroupId } = await params;
    const origin = new URL(request.url).origin;
    const detailResponse = await fetch(
      `${origin}/api/business/sessions/groups/${encodeURIComponent(sessionGroupId)}`,
      {
        headers: authHeader ? { authorization: authHeader } : undefined,
        cache: "no-store",
      }
    );
    const payload = (await detailResponse.json().catch(() => ({}))) as SessionExportPayload;

    if (!detailResponse.ok) {
      return NextResponse.json(
        {
          code: "SESSION_EXPORT_SOURCE_FAILED",
          message: payload.message ?? "Unable to load session data for export.",
        },
        { status: detailResponse.status }
      );
    }

    const orgId = payload.org?.orgId ?? "";
    const orgName = payload.org?.name ?? "";
    const session = payload.session;
    if (!session) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Session group not found." },
        { status: 404 }
      );
    }

    const lines: string[] = [];
    lines.push(csvRow(["Section", "Field", "Value"]));
    lines.push(csvRow(["Session Stats", "Org ID", orgId]));
    lines.push(csvRow(["Session Stats", "Org Name", orgName]));
    lines.push(csvRow(["Session Stats", "Session Group ID", session.sessionGroupId ?? sessionGroupId]));
    lines.push(csvRow(["Session Stats", "Session Name", session.derivedName ?? ""]));
    lines.push(csvRow(["Session Stats", "Status", session.status ?? ""]));
    lines.push(csvRow(["Session Stats", "Session Type", session.sessionType ?? ""]));
    lines.push(csvRow(["Session Stats", "Identity Source", session.identitySource ?? ""]));
    lines.push(csvRow(["Session Stats", "Identity Confidence", session.identityConfidence ?? ""]));
    lines.push(csvRow(["Session Stats", "Identity Needs Review", session.identityNeedsReview ?? false]));
    lines.push(csvRow(["Session Stats", "Game Count", session.gameCount ?? 0]));
    lines.push(csvRow(["Session Stats", "Player Count", session.summary?.playerCount ?? 0]));
    lines.push(csvRow(["Session Stats", "Created At", session.createdAt ?? ""]));
    lines.push(csvRow(["Session Stats", "Started At", session.summary?.startAt ?? session.startedAt ?? ""]));
    lines.push(csvRow(["Session Stats", "Ended At", session.summary?.endAt ?? session.endedAt ?? ""]));
    lines.push(csvRow(["Session Health", "Join Rate", toPercent(session.health?.joinRate)]));
    lines.push(csvRow(["Session Health", "Completion Rate", toPercent(session.health?.completionRate)]));
    lines.push(csvRow(["Session Health", "Drop-off Rate", toPercent(session.health?.dropOffRate)]));
    lines.push(csvRow(["Session Health", "Health Status", session.health?.status ?? ""]));
    lines.push("");

    lines.push(csvRow(["Insights", "Severity", "Title", "Summary"]));
    for (const insight of session.insights ?? []) {
      lines.push(csvRow(["Insights", insight.severity ?? "", insight.title ?? "", insight.summary ?? ""]));
    }
    lines.push("");

    lines.push(csvRow(["Alerts", "Level", "Title", "Message"]));
    for (const alert of session.alerts ?? []) {
      lines.push(csvRow(["Alerts", alert.level ?? "", alert.title ?? "", alert.message ?? ""]));
    }
    lines.push("");

    lines.push(csvRow(["Games", "Game Code", "Created At", "Started At", "Ended At"]));
    for (const game of session.games ?? []) {
      lines.push(csvRow(["Games", game.gameCode ?? "", game.createdAt ?? "", game.startedAt ?? "", game.endedAt ?? ""]));
    }
    lines.push("");

    lines.push(
      csvRow([
        "Staff Stats",
        "Player ID",
        "Display Name",
        "Primary Game",
        "Claims Attempted",
        "Claims Confirmed",
        "Claims Denied",
        "Accuracy",
        "Survival",
        "Deaths",
        "Dispute Rate",
      ])
    );
    for (const player of session.players ?? []) {
      lines.push(
        csvRow([
          "Staff Stats",
          player.playerId ?? "",
          player.displayName ?? "",
          player.primaryGameCode ?? "",
          player.claimsAttempted ?? 0,
          player.claimsConfirmed ?? 0,
          player.claimsDenied ?? 0,
          toPercent(player.accuracyRatio),
          toPercent(player.survivalRatio),
          player.deaths ?? 0,
          toPercent(player.disputeRateRatio),
        ])
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="session-group-${sessionGroupId}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before exporting session stats." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }
    console.error("[business:sessions:group-export] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to export session stats." }, { status: 500 });
  }
}

