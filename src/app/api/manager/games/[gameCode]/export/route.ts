import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { eventLabel, normalizePlayerAggregate } from "@/lib/analytics/manager-dashboard";
import {
  assertManagerAccessForGame,
  ManagerAccessInfrastructureError,
  ManagerForbiddenError,
  ManagerGameNotFoundError,
  ManagerUnauthenticatedError,
} from "@/lib/manager/access";
import { hasFeature, type ProductTier } from "@/lib/product/entitlements";
import { resolveOrganizationTier } from "@/lib/product/org-tier";

export const runtime = "nodejs";

type AnalyticsOverview = {
  gameName?: unknown;
  status?: unknown;
  mode?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  totalPlayers?: unknown;
  activePlayers?: unknown;
  totalSessions?: unknown;
};

type AnalyticsSessionSummary = {
  totalSessions?: unknown;
  avgSessionLengthSeconds?: unknown;
  longestSessionSeconds?: unknown;
  lastSessionAt?: unknown;
};

type AnalyticsDoc = {
  overview?: unknown;
  insights?: unknown;
  playerPerformance?: unknown;
  sessionSummary?: unknown;
  updatedAt?: unknown;
};
type PlayerAnalyticsDoc = {
  playerId?: unknown;
  userId?: unknown;
  displayName?: unknown;
  eventsTotal?: unknown;
  eventCounts?: unknown;
  kills?: unknown;
  deaths?: unknown;
  accuracyPct?: unknown;
  sessionCount?: unknown;
  updatedAt?: unknown;
};

type OrgBrandingDoc = {
  companyName?: unknown;
  companyLogoUrl?: unknown;
  brandAccentColor?: unknown;
  brandThemeLabel?: unknown;
};

type OrgDoc = {
  name?: unknown;
  branding?: unknown;
};

type ManagerPlayer = {
  playerId: string;
  displayName: string;
  kills: number;
  deaths: number;
  kdRatio: number;
  accuracyPct: number;
  sessionCount: number;
};

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown): string | null {
  const parsed = asString(value).trim();
  return parsed.length > 0 ? parsed : null;
}

function toCsvCell(value: string | number | null): string {
  if (value == null) return "";
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values: Array<string | number | null>): string {
  return values.map((value) => toCsvCell(value)).join(",");
}

function findTopPerformer(players: ManagerPlayer[]): ManagerPlayer | null {
  if (players.length === 0) return null;
  return [...players].sort((a, b) => b.kills - a.kills || b.kdRatio - a.kdRatio || b.accuracyPct - a.accuracyPct)[0] ?? null;
}

function findCoachingRisk(players: ManagerPlayer[]): ManagerPlayer | null {
  const active = players.filter((player) => player.sessionCount > 0);
  if (active.length === 0) return null;
  return [...active].sort((a, b) => b.deaths - a.deaths || a.kdRatio - b.kdRatio || a.accuracyPct - b.accuracyPct)[0] ?? null;
}

function findInsightMetric(insights: Array<{ label: string; value: number }>, token: string): number | null {
  const found = insights.find((insight) => insight.label.toLowerCase().includes(token));
  return found ? found.value : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function normalizeBranding(value: unknown, fallbackName: string | null): {
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
} {
  const branding = value && typeof value === "object" ? (value as OrgBrandingDoc) : {};
  return {
    companyName: asNullableString(branding.companyName) ?? fallbackName,
    companyLogoUrl: asNullableString(branding.companyLogoUrl),
    brandAccentColor: asNullableString(branding.brandAccentColor),
    brandThemeLabel: asNullableString(branding.brandThemeLabel),
  };
}

async function resolveOrgBranding(orgId: string): Promise<{
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
}> {
  const canonical = await adminDb.collection("orgs").doc(orgId).get();
  if (canonical.exists) {
    const data = (canonical.data() ?? {}) as OrgDoc;
    return normalizeBranding(data.branding, asNullableString(data.name));
  }
  const legacy = await adminDb.collection("organizations").doc(orgId).get();
  if (legacy.exists) {
    const data = (legacy.data() ?? {}) as OrgDoc;
    return normalizeBranding(data.branding, asNullableString(data.name));
  }
  return {
    companyName: null,
    companyLogoUrl: null,
    brandAccentColor: null,
    brandThemeLabel: null,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const { gameCode } = await params;
    const normalizedCode = gameCode.trim().toUpperCase();
    await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);

    const gameDoc = await adminDb.collection("games").doc(normalizedCode).get();
    const gameData = (gameDoc.data() ?? {}) as { orgId?: unknown; started?: unknown; ended?: unknown; mode?: unknown };
    const orgId = typeof gameData.orgId === "string" ? gameData.orgId.trim() : "";
    const tier: ProductTier = orgId ? await resolveOrganizationTier(orgId) : "basic";
    const branding = orgId ? await resolveOrgBranding(orgId) : null;
    if (!hasFeature(tier, "exports")) {
      return NextResponse.json(
        {
          code: "FEATURE_LOCKED",
          message: "Exports are available on Enterprise tier.",
        },
        { status: 403 }
      );
    }

    const [playerAnalyticsSnap, analyticsEventsSnap] = await Promise.all([
      adminDb.collection("playerAnalytics").where("gameCode", "==", normalizedCode).get(),
      adminDb.collection("analyticsEvents").where("gameCode", "==", normalizedCode).limit(500).get(),
    ]);
    if (playerAnalyticsSnap.empty && analyticsEventsSnap.empty) {
      return NextResponse.json(
        {
          code: "ANALYTICS_NOT_FOUND",
          message: "Game exists, but aggregated analytics are not generated yet.",
        },
        { status: 404 }
      );
    }

    const perEventTotals = new Map<string, number>();
    const players = playerAnalyticsSnap.docs.map((doc, index) => {
      const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
      const eventCounts =
        data.eventCounts && typeof data.eventCounts === "object" ? (data.eventCounts as Record<string, unknown>) : {};
      for (const [eventType, rawCount] of Object.entries(eventCounts)) {
        perEventTotals.set(eventType, (perEventTotals.get(eventType) ?? 0) + asNumber(rawCount));
      }
      const normalized = normalizePlayerAggregate({
        row: data,
        fallbackPlayerId: `row-${index}`,
        normalizedMode: asString(gameData.mode).trim().toLowerCase(),
      });
      return {
        playerId: normalized.playerId,
        displayName: normalized.displayName,
        kills: normalized.kills ?? 0,
        deaths: normalized.deaths ?? 0,
        kdRatio: normalized.kdRatio ?? 0,
        accuracyPct: normalized.accuracyPct ?? asNumber(data.accuracyPct),
        sessionCount: Math.max(1, normalized.sessionCount ?? asNumber(data.sessionCount) ?? 1),
      };
    });
    if (playerAnalyticsSnap.empty) {
      for (const doc of analyticsEventsSnap.docs) {
        const row = doc.data() as Record<string, unknown>;
        const eventType = asNullableString(row.eventType) ?? asNullableString(row.type);
        if (!eventType) continue;
        perEventTotals.set(eventType, (perEventTotals.get(eventType) ?? 0) + 1);
      }
    }
    const insights = [...perEventTotals.entries()].map(([type, value]) => ({ label: eventLabel(type), value }));
    const gameOverview: AnalyticsOverview = {
      gameName: normalizedCode,
      status: gameData.ended ? "ended" : gameData.started ? "active" : "not_started",
      mode: asString((gameData as Record<string, unknown>).mode),
      startedAt: asString((gameData as Record<string, unknown>).started),
      endedAt: asString((gameData as Record<string, unknown>).ended),
      totalPlayers: playerAnalyticsSnap.size,
      activePlayers: playerAnalyticsSnap.size,
      totalSessions: playerAnalyticsSnap.size > 0 ? 1 : 0,
    };
    const summary: AnalyticsSessionSummary = {
      totalSessions: playerAnalyticsSnap.size > 0 ? 1 : 0,
      avgSessionLengthSeconds: 0,
      longestSessionSeconds: 0,
      lastSessionAt: asString((gameData as Record<string, unknown>).ended) || asString((gameData as Record<string, unknown>).started),
    };
    const payload: AnalyticsDoc = { overview: gameOverview, sessionSummary: summary, insights, playerPerformance: players, updatedAt: null };
    const overview = gameOverview;

    const topPerformer = findTopPerformer(players);
    const coachingRisk = findCoachingRisk(players);
    const claims = findInsightMetric(insights, "claim");
    const disputes = findInsightMetric(insights, "dispute");
    const successRate = findInsightMetric(insights, "success");
    const teamComparison = insights
      .filter((insight) => {
        const label = insight.label.toLowerCase();
        return label.includes("team") || label.includes("guild");
      })
      .slice(0, 2);

    const format = new URL(request.url).searchParams.get("format")?.trim().toLowerCase() ?? "csv";

    if (format === "pdf") {
      const sessionTitle = asString(overview.gameName) || normalizedCode;
      const reportTitle = branding?.companyName ? `${branding.companyName} Session Report` : "Session Summary Report";
      const accent = branding?.brandAccentColor ?? "#0f172a";
      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Session Report ${escapeHtml(normalizedCode)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; }
    h2 { margin: 18px 0 8px; font-size: 16px; }
    p { margin: 4px 0; }
    .header { border-top: 4px solid ${escapeHtml(accent)}; padding-top: 10px; margin-bottom: 12px; }
    .brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
    .brand-logo { max-height: 42px; max-width: 120px; object-fit: contain; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; text-align: left; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-row">
      ${branding?.companyLogoUrl ? `<img class="brand-logo" src="${escapeHtml(branding.companyLogoUrl)}" alt="Company logo" />` : ""}
      <div>
        <h1>${escapeHtml(reportTitle)}</h1>
        ${branding?.brandThemeLabel ? `<p><strong>Theme:</strong> ${escapeHtml(branding.brandThemeLabel)}</p>` : ""}
      </div>
    </div>
  </div>
  <p><strong>Session:</strong> ${escapeHtml(sessionTitle)}</p>
  <p><strong>Game Code:</strong> ${escapeHtml(normalizedCode)}</p>
  <p><strong>Company:</strong> ${escapeHtml(branding?.companyName ?? "--")}</p>
  <p><strong>Date:</strong> ${escapeHtml(formatDate(asNullableString(summary.lastSessionAt) ?? asNullableString(overview.endedAt) ?? asNullableString(overview.startedAt)))}</p>
  <h2>Top Performer</h2>
  <p>${escapeHtml(
    topPerformer
      ? `${topPerformer.displayName} (${topPerformer.kills} kills, ${topPerformer.kdRatio.toFixed(2)} K/D)`
      : "No player performance data available."
  )}</p>
  <h2>Coaching / Risk Indicator</h2>
  <p>${escapeHtml(
    coachingRisk
      ? `${coachingRisk.displayName} (${coachingRisk.deaths} deaths, ${coachingRisk.kdRatio.toFixed(2)} K/D)`
      : "No coaching risk indicator available."
  )}</p>
  <h2>Key Insights</h2>
  <p>${escapeHtml(`Claims: ${claims ?? "--"} | Disputes: ${disputes ?? "--"} | Success Rate: ${successRate ?? "--"}`)}</p>
  <h2>Team Comparison</h2>
  <p>${escapeHtml(
    teamComparison.length > 0
      ? teamComparison.map((metric) => `${metric.label}: ${metric.value}`).join(" | ")
      : "No team comparison metrics available."
  )}</p>
  <h2>Player Performance</h2>
  <table>
    <thead><tr><th>Player</th><th>Kills</th><th>Deaths</th><th>K/D</th><th>Accuracy %</th><th>Sessions</th></tr></thead>
    <tbody>
      ${players
        .map(
          (player) =>
            `<tr><td>${escapeHtml(player.displayName)}</td><td>${player.kills}</td><td>${player.deaths}</td><td>${player.kdRatio.toFixed(
              2
            )}</td><td>${player.accuracyPct.toFixed(1)}</td><td>${player.sessionCount}</td></tr>`
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

      return new NextResponse(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-disposition": `attachment; filename="session-report-${normalizedCode}.html"`,
          "cache-control": "no-store",
        },
      });
    }

    const csvLines: string[] = [];
    csvLines.push(csvRow(["Section", "Key", "Value"]));
    csvLines.push(csvRow(["Branding", "Company Name", branding?.companyName ?? ""]));
    csvLines.push(csvRow(["Branding", "Company Logo URL", branding?.companyLogoUrl ?? ""]));
    csvLines.push(csvRow(["Branding", "Brand Accent Color", branding?.brandAccentColor ?? ""]));
    csvLines.push(csvRow(["Branding", "Brand Theme Label", branding?.brandThemeLabel ?? ""]));
    csvLines.push(csvRow(["Session Metrics", "Game Code", normalizedCode]));
    csvLines.push(csvRow(["Session Metrics", "Session Name", asString(overview.gameName) || normalizedCode]));
    csvLines.push(csvRow(["Session Metrics", "Status", asString(overview.status)]));
    csvLines.push(csvRow(["Session Metrics", "Mode", asString(overview.mode)]));
    csvLines.push(csvRow(["Session Metrics", "Total Players", asNumber(overview.totalPlayers)]));
    csvLines.push(csvRow(["Session Metrics", "Active Players", asNumber(overview.activePlayers)]));
    csvLines.push(csvRow(["Session Metrics", "Total Sessions", asNumber(overview.totalSessions)]));
    csvLines.push(csvRow(["Session Metrics", "Started At", asNullableString(overview.startedAt)]));
    csvLines.push(csvRow(["Session Metrics", "Ended At", asNullableString(overview.endedAt)]));
    csvLines.push(csvRow(["Session Metrics", "Updated At", asNullableString(payload.updatedAt)]));
    csvLines.push(csvRow(["Session Summary", "Average Session Length Seconds", asNumber(summary.avgSessionLengthSeconds)]));
    csvLines.push(csvRow(["Session Summary", "Longest Session Seconds", asNumber(summary.longestSessionSeconds)]));
    csvLines.push(csvRow(["Session Summary", "Last Session At", asNullableString(summary.lastSessionAt)]));
    csvLines.push(csvRow(["Session Summary", "Top Performer", topPerformer ? topPerformer.displayName : ""]));
    csvLines.push(csvRow(["Session Summary", "Coaching Risk", coachingRisk ? coachingRisk.displayName : ""]));
    csvLines.push(csvRow(["Session Summary", "Claims", claims]));
    csvLines.push(csvRow(["Session Summary", "Disputes", disputes]));
    csvLines.push(csvRow(["Session Summary", "Success Rate", successRate]));
    csvLines.push("");
    csvLines.push(csvRow(["Insights", "Label", "Value"]));
    for (const insight of insights) {
      csvLines.push(csvRow(["Insights", insight.label, insight.value]));
    }
    csvLines.push("");
    csvLines.push(csvRow(["Player Performance", "Player ID", "Display Name", "Kills", "Deaths", "K/D", "Accuracy %", "Sessions"]));
    for (const player of players) {
      csvLines.push(
        csvRow([
          "Player Performance",
          player.playerId,
          player.displayName,
          player.kills,
          player.deaths,
          player.kdRatio.toFixed(2),
          player.accuracyPct.toFixed(1),
          player.sessionCount,
        ])
      );
    }

    const csv = csvLines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="session-report-${normalizedCode}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ManagerUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before exporting this report." }, { status: 401 });
    }
    if (error instanceof ManagerForbiddenError) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: error.message || "This account is not authorized to export this report." },
        { status: 403 }
      );
    }
    if (error instanceof ManagerGameNotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Game not found." }, { status: 404 });
    }
    if (error instanceof ManagerAccessInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[manager:export] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to export report." }, { status: 500 });
  }
}
