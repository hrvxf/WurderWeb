"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import GameOverviewPanel from "@/components/business/dashboard/GameOverviewPanel";
import InsightCards from "@/components/business/dashboard/InsightCards";
import PlayerPerformanceTable from "@/components/business/dashboard/PlayerPerformanceTable";
import SessionSummary from "@/components/business/dashboard/SessionSummary";
import ManagerRecommendations from "@/components/business/dashboard/ManagerRecommendations";
import SessionTimeline from "@/components/business/dashboard/SessionTimeline";
import { computeAccuracy, computeDisputeRate, computeDurationMs, computeKd, toNullableNumber } from "@wurder/shared-analytics";
import type { DashboardResponse, PlayerPerformance } from "@wurder/shared-analytics";
import type {
  AnalyticsAccessState,
  ManagerAnalyticsDocument,
  ManagerBranding,
  ManagerInsight,
  ManagerOverview,
  ManagerSessionSummary,
} from "@/components/business/dashboard/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useManagerRouteGuard } from "@/lib/auth/use-manager-route-guard";
import { BUSINESS_ROUTES, businessSessionDashboardApiRoute, businessSessionExportApiRoute, businessSessionRoute } from "@/lib/business/routes";

type ManagerDashboardPageProps = {
  gameCode: string;
};

function LockedSection({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-900">{title}</h2>
      <p className="mt-2 text-sm text-amber-900">{message}</p>
    </section>
  );
}

function hasLiveInsights(insights: ManagerInsight[]): boolean {
  return insights.some((insight) => insight.value > 0 || Boolean(insight.message?.trim()));
}

function hasPlayerPerformance(players: PlayerPerformance[]): boolean {
  return players.some((player) => {
    const kills = toNullableNumber(player.kills ?? player.confirmedKills);
    const deaths = toNullableNumber(player.deaths);
    const claims = toNullableNumber(player.claims);
    const disputes = toNullableNumber(player.disputes);
    return [kills, deaths, claims, disputes].some((value) => value != null && value > 0);
  });
}

type ReportAction = "csv" | "summary";

type SummaryModalState = {
  open: boolean;
  title: string;
  details: string;
};

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatInsightLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  const labelMap: Record<string, string> = {
    game_started: "Game Started",
    game_ended: "Game Ended",
    admin_confirm_kill_claim: "Admin Confirm Kill Claim",
    admin_deny_kill_claim: "Admin Deny Kill Claim",
  };
  if (labelMap[normalized]) return labelMap[normalized];
  return normalized
    .split("_")
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function normalizeOverview(value: unknown, gameCode: string): ManagerOverview {
  const overview = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    gameCode,
    gameName: parseString(overview.gameName),
    status: parseString(overview.status) || "unknown",
    lifecycleStatus:
      parseString(overview.lifecycleStatus) === "completed"
        ? "completed"
        : parseString(overview.lifecycleStatus) === "in_progress"
          ? "in_progress"
          : "not_started",
    mode: parseNullableString(overview.mode),
    startedAt: parseNullableString(overview.startedAt),
    endedAt: parseNullableString(overview.endedAt),
    totalPlayers: parseNumber(overview.totalPlayers),
    activePlayers: parseNumber(overview.activePlayers),
    totalSessions: parseNumber(overview.totalSessions),
    totalEvents: parseNumber(overview.totalEvents),
    metricSemantics: {
      deaths: {
        modeBasis: "fallback_death_events",
      },
    },
  };
}

function normalizeInsights(value: unknown): ManagerInsight[] {
  const normalizeTriggeredBy = (
    candidate: unknown
  ): Array<{ metric: string; actual: number; expected: number; comparator: "<" | ">" | "<=" | ">=" | "=" }> => {
    if (!Array.isArray(candidate)) return [];
    return candidate
      .map((item) => {
        const trigger = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const metric = parseString(trigger.metric);
        const actual = parseNullableNumber(trigger.actual);
        const expected = parseNullableNumber(trigger.expected);
        const comparator = parseString(trigger.comparator);
        if (!metric || actual == null || expected == null) return null;
        if (!["<", ">", "<=", ">=", "="].includes(comparator)) return null;
        return {
          metric,
          actual,
          expected,
          comparator: comparator as "<" | ">" | "<=" | ">=" | "=",
        };
      })
      .filter((item): item is { metric: string; actual: number; expected: number; comparator: "<" | ">" | "<=" | ">=" | "=" } => item != null);
  };

  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        const insight = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const unitRaw = parseString(insight.unit);
        const severityRaw = parseString(insight.severity);
        const unit: ManagerInsight["unit"] = unitRaw === "ratio" || unitRaw === "ms" ? unitRaw : "count";
        const severity: ManagerInsight["severity"] =
          severityRaw === "critical" ? "critical" : severityRaw === "warning" ? "warning" : "info";
        return {
          id: parseString(insight.id) || `insight-${index}`,
          label: formatInsightLabel(parseString(insight.label)),
          value: parseNumber(insight.value),
          unit,
          severity,
          message: parseNullableString(insight.message) ?? "",
          evidence: normalizeTriggeredBy(insight.evidence),
          triggeredBy: normalizeTriggeredBy(insight.triggeredBy),
        };
      })
      .filter((item) => item.label.length > 0);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, insightValue], index) => ({
        id: `insight-${index}`,
        label: formatInsightLabel(parseString(label)),
        value: parseNumber(insightValue),
        unit: "count" as const,
        severity: "info" as const,
        message: "",
      }))
      .filter((item) => item.label.length > 0);
  }

  return [];
}

function normalizePlayers(value: unknown): ManagerAnalyticsDocument["playerPerformance"] {
  const rows: unknown[] = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value as Record<string, unknown>).map(([playerId, player]) =>
          player && typeof player === "object" && !Array.isArray(player)
            ? ({ playerId, ...(player as Record<string, unknown>) } as Record<string, unknown>)
            : { playerId, displayName: playerId }
        )
      : [];

  return rows.map((item, index) => {
    const player = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const kills = toNullableNumber(player.kills ?? player.confirmedKills);
    const deaths = toNullableNumber(player.deaths);
    const claims = toNullableNumber(player.claims);
    const disputes = toNullableNumber(player.disputes);
    const confirmedKills = toNullableNumber(player.confirmedKills) ?? kills;
    const displayName = parseString(player.displayName) || parseString(player.playerName) || "Unknown";
    const killsRatio = kills != null && deaths != null ? computeKd(kills, deaths) : null;
    const accuracyRatio =
      parseNullableNumber(player.accuracy) ??
      parseNullableNumber(player.successRate) ??
      (confirmedKills != null && claims != null ? computeAccuracy(confirmedKills, claims) : null);
    const disputeRateRatio =
      parseNullableNumber(player.disputeRate) ??
      (disputes != null && claims != null ? computeDisputeRate(disputes, claims) : null);

    return {
      playerId: parseString(player.playerId) || `row-${index}`,
      playerName: parseString(player.playerName) || displayName,
      displayName,
      avatarUrl: parseNullableString(player.avatarUrl),
      userId: parseNullableString(player.userId),
      kills: kills ?? 0,
      confirmedKills: confirmedKills ?? undefined,
      deaths: deaths ?? 0,
      kd: parseNullableNumber(player.kd) ?? killsRatio,
      kdRatio: parseNullableNumber(player.kdRatio) ?? parseNullableNumber(player.kd) ?? killsRatio,
      accuracy: accuracyRatio,
      accuracyRatio,
      successRate: parseNullableNumber(player.successRate) ?? parseNullableNumber(player.accuracy),
      claims: claims ?? undefined,
      claimsSubmitted: parseNullableNumber(player.claimsSubmitted) ?? claims,
      claimsConfirmed: parseNullableNumber(player.claimsConfirmed) ?? confirmedKills,
      claimsDenied: parseNullableNumber(player.claimsDenied) ?? parseNullableNumber(player.deniedClaims),
      disputes: disputes ?? undefined,
      disputeRate: disputeRateRatio,
      disputeRateRatio,
      sessionCount: parseNullableNumber(player.sessionCount),
      deathsBasis:
        parseString(player.deathsBasis) === "confirmed_claims_against_player"
          ? "confirmed_claims_against_player"
          : parseString(player.deathsBasis) === "elimination_deaths"
            ? "elimination_deaths"
            : "fallback_death_events",
    };
  });
}

function normalizeSessionSummary(value: unknown): ManagerSessionSummary {
  const summary = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    totalSessions: parseNumber(summary.totalSessions),
    avgSessionLengthSeconds: parseNullableNumber(summary.avgSessionLengthSeconds),
    longestSessionSeconds: parseNullableNumber(summary.longestSessionSeconds),
    lastSessionAt: parseNullableString(summary.lastSessionAt),
    startedAt: parseNullableString(summary.startedAt),
    endedAt: parseNullableString(summary.endedAt),
    durationMs: parseNullableNumber(summary.durationMs),
    avgSessionDurationMs: parseNullableNumber(summary.avgSessionDurationMs),
    longestSessionDurationMs: parseNullableNumber(summary.longestSessionDurationMs),
    totalClaimsSubmitted: parseNumber(summary.totalClaimsSubmitted),
    totalClaimsDenied: parseNumber(summary.totalClaimsDenied),
  };
}

function normalizeAnalytics(value: unknown, gameCode: string): ManagerAnalyticsDocument {
  const analytics = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const normalizedOverview = normalizeOverview(analytics.overview, gameCode);
  const normalizedPlayers = normalizePlayers(analytics.playerPerformance ?? analytics.playerBreakdown);
  const normalizedInsights = normalizeInsights(analytics.insights);
  const normalizedSummary = normalizeSessionSummary(analytics.sessionSummary ?? analytics.session);
  const dashboard = {
    gameCode,
    orgId: parseString(analytics.orgId),
    session: {
      startedAt: normalizedOverview.startedAt,
      endedAt: normalizedOverview.endedAt,
      durationMs: computeDurationMs({
        startedAtMs: normalizedOverview.startedAt ? new Date(normalizedOverview.startedAt).getTime() : null,
        endedAtMs: normalizedOverview.endedAt ? new Date(normalizedOverview.endedAt).getTime() : null,
      }),
      status: undefined,
      sessionName: normalizedOverview.gameName,
    },
    overview: {
      totalPlayers: normalizedOverview.totalPlayers,
      totalClaims: normalizedInsights.find((insight) => insight.label.toLowerCase() === "claims")?.value ?? 0,
      totalDisputes: normalizedInsights.find((insight) => insight.label.toLowerCase() === "disputes")?.value ?? 0,
      avgResolutionTime: null,
    },
    topPerformers: {
      bestSuccessRate: null,
      mostKills: null,
      lowestDisputeRate: null,
    },
    playerBreakdown: normalizedPlayers,
    insights: Array.isArray(analytics.insights) ? analytics.insights : [],
  } satisfies DashboardResponse;

  return {
    dashboard,
    overview: normalizedOverview,
    insights: normalizedInsights,
    playerPerformance: normalizedPlayers,
    sessionSummary: {
      ...normalizedSummary,
      startedAt: normalizedOverview.startedAt,
      endedAt: normalizedOverview.endedAt,
    },
    updatedAt: parseNullableString(analytics.updatedAt),
  };
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "--";

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "--";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(asDate);
}

function formatLifecycleLabel(status: ManagerOverview["lifecycleStatus"] | null | undefined): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "Live";
  return "Not Started";
}

function formatElapsed(overview: ManagerOverview | null): string {
  if (!overview?.startedAt) return "--";

  const startedAtMs = new Date(overview.startedAt).getTime();
  const endedAtMs = overview.endedAt ? new Date(overview.endedAt).getTime() : Date.now();
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) return "--";

  const durationMs = computeDurationMs({ startedAtMs, endedAtMs });
  if (durationMs == null || durationMs < 0) return "--";

  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default function ManagerDashboardPage({ gameCode }: ManagerDashboardPageProps) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<ManagerAnalyticsDocument | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "missing" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [analyticsAccess, setAnalyticsAccess] = useState<AnalyticsAccessState | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "downloading">("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState>({
    open: false,
    title: "Summary download",
    details: "",
  });
  const [branding, setBranding] = useState<ManagerBranding | null>(null);
  const { user } = useAuth();
  const guard = useManagerRouteGuard(gameCode);

  useEffect(() => {
    if (guard.status !== "unauthenticated") return;
    const next = encodeURIComponent(businessSessionRoute(gameCode.trim()));
    router.replace(`/login?next=${next}`);
  }, [gameCode, guard.status, router]);

  useEffect(() => {
    const normalizedCode = gameCode.trim();
    if (guard.status !== "allowed") {
      setStatus("idle");
      setStatusMessage(null);
      setAnalyticsAccess(null);
      setExportMessage(null);
      setBranding(null);
      setAnalytics(null);
      return;
    }

    if (!normalizedCode) {
      setStatus("missing");
      setStatusMessage("Missing game code.");
      setAnalytics(null);
      return;
    }

    let isCancelled = false;
    setStatus("loading");

    const load = async () => {
      try {
        const token = await user?.getIdToken();
        if (!token) {
          setStatus("error");
          setStatusMessage("Unable to verify your session token.");
          setAnalytics(null);
          return;
        }

        const response = await fetch(businessSessionDashboardApiRoute(normalizedCode), {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const payload = (await response.json().catch(() => ({}))) as {
          analytics?: unknown;
          analyticsAccess?: unknown;
          branding?: unknown;
          code?: unknown;
          message?: unknown;
        };

        if (isCancelled) return;

        if (response.ok) {
          if (!payload.analytics || typeof payload.analytics !== "object") {
            if (process.env.NODE_ENV !== "production") {
              console.warn("[manager] Missing or malformed analytics payload", {
                gameCode: normalizedCode,
                payload,
              });
            }
          }
          setAnalytics(normalizeAnalytics(payload.analytics, normalizedCode));
          const normalizedAccess =
            payload.analyticsAccess && typeof payload.analyticsAccess === "object"
              ? (payload.analyticsAccess as Record<string, unknown>)
              : {};
          const normalizedAllowedSections =
            normalizedAccess.allowedSections && typeof normalizedAccess.allowedSections === "object"
              ? (normalizedAccess.allowedSections as Record<string, unknown>)
              : {};
          setAnalyticsAccess({
            visibility: parseString(normalizedAccess.visibility) === "full_post_session" ? "full_post_session" : "limited_live",
            allowedSections: {
              overview: Boolean(normalizedAllowedSections.overview),
              insights: Boolean(normalizedAllowedSections.insights),
              playerComparison: Boolean(normalizedAllowedSections.playerComparison),
              sessionSummary: Boolean(normalizedAllowedSections.sessionSummary),
              exports: Boolean(normalizedAllowedSections.exports),
            },
            message: parseNullableString(normalizedAccess.message),
          });
          const normalizedBranding =
            payload.branding && typeof payload.branding === "object"
              ? (payload.branding as Record<string, unknown>)
              : {};
          setBranding({
            companyName: parseNullableString(normalizedBranding.companyName),
            companyLogoUrl: parseNullableString(normalizedBranding.companyLogoUrl),
            brandAccentColor: parseNullableString(normalizedBranding.brandAccentColor),
            brandThemeLabel: parseNullableString(normalizedBranding.brandThemeLabel),
          });
          setStatusMessage(null);
          setStatus("ready");
          return;
        }

        if (response.status === 404) {
          setStatus("missing");
          setStatusMessage(
            parseString(payload.code) === "ANALYTICS_NOT_FOUND"
              ? "Game exists, but aggregated analytics are not generated yet."
              : "Game analytics were not found."
          );
          setAnalytics(null);
          return;
        }

        setStatus("error");
        setStatusMessage(parseString(payload.message) || "Unable to load dashboard analytics.");
        setAnalytics(null);
      } catch (error) {
        if (isCancelled) return;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[manager] Dashboard fetch failed", {
            gameCode: normalizedCode,
            error,
          });
        }
        setStatus("error");
        setStatusMessage("Unable to load dashboard analytics right now.");
        setAnalytics(null);
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [gameCode, guard.status, user]);

  const updatedAtLabel = useMemo(() => formatUpdatedAt(analytics?.updatedAt ?? null), [analytics?.updatedAt]);
  const isLiveLimited = analyticsAccess?.visibility === "limited_live";
  const canShowInsights = useMemo(() => (analytics ? analyticsAccess?.allowedSections.insights || hasLiveInsights(analytics.insights) : false), [analytics, analyticsAccess]);
  const canShowPlayerPerformance = useMemo(
    () => (analytics ? analyticsAccess?.allowedSections.playerComparison || hasPlayerPerformance(analytics.playerPerformance) : false),
    [analytics, analyticsAccess]
  );
  const canShowSessionSummary = useMemo(
    () => (analytics ? analyticsAccess?.allowedSections.sessionSummary || analytics.overview.startedAt != null : false),
    [analytics, analyticsAccess]
  );
  const canShowFinalRecommendations = useMemo(
    () => (analytics ? analyticsAccess?.allowedSections.sessionSummary && analytics.overview.endedAt != null : false),
    [analytics, analyticsAccess]
  );

  const parseExportError = (errorPayload: { code?: unknown; message?: unknown }): string => {
    const code = parseString(errorPayload.code);
    if (code === "FEATURE_LOCKED") {
      return "Your current plan does not include reporting exports.";
    }
    if (code === "FORBIDDEN") {
      return "Summary downloads are only available after the session has ended.";
    }
    return parseString(errorPayload.message) || "Unable to export report.";
  };

  const callReportingExport = async (action: ReportAction) => {
    if (!user) {
      setExportMessage("Sign in before exporting this report.");
      return;
    }

    const normalizedCode = gameCode.trim();
    if (!normalizedCode) {
      setExportMessage("Missing game code.");
      return;
    }

    setExportStatus("downloading");
    setExportMessage(null);

    try {
      const token = await user.getIdToken();
      const format = action === "csv" ? "csv" : "pdf";
      const response = await fetch(businessSessionExportApiRoute(normalizedCode, format), {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { code?: unknown; message?: unknown };
        setExportMessage(parseExportError(errorPayload));
        return;
      }

      const content = await response.text();
      const mimeType = action === "csv" ? "text/csv;charset=utf-8" : "text/html;charset=utf-8";
      const blob = new Blob([content], { type: mimeType });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const extension = action === "csv" ? "csv" : "html";
      anchor.href = objectUrl;
      anchor.download = `session-${action === "csv" ? "report" : "summary"}-${normalizedCode.toUpperCase()}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);

      if (action === "summary") {
        setSummaryModal({
          open: true,
          title: "Summary downloaded",
          details: "Downloaded an HTML summary. PDF export can be added later using the same backend action.",
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[manager] Export failed", {
          gameCode: normalizedCode,
          action,
          error,
        });
      }
      setExportMessage("Unable to export report right now.");
    } finally {
      setExportStatus("idle");
    }
  };

  const lifecycleLabel = formatLifecycleLabel(analytics?.overview.lifecycleStatus);
  const lifecycleTone =
    analytics?.overview.lifecycleStatus === "completed"
      ? "var(--mc-success)"
      : analytics?.overview.lifecycleStatus === "in_progress"
        ? "var(--mc-primary)"
        : "var(--mc-warning)";
  const durationLabel = formatElapsed(analytics?.overview ?? null);

  return (
    <div className="mission-control space-y-6 p-4 md:p-6">
      <header
        className="mission-control__hero p-5 sm:p-6"
        style={branding?.brandAccentColor ? { borderTopWidth: "4px", borderTopColor: branding.brandAccentColor } : undefined}
      >
        <div className="relative z-10 grid gap-5 xl:grid-cols-[1.6fr_1fr] xl:items-start">
          <div className="space-y-4">
            <p className="mission-control__label">Mission Control</p>
            <div className="flex items-start gap-3">
              {branding?.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.companyLogoUrl} alt={`${branding.companyName ?? "Company"} logo`} className="h-12 w-12 rounded object-contain" />
              ) : null}
              <div className="space-y-2">
                <h1 className="mission-control__display text-2xl font-semibold sm:text-3xl">
                  {branding?.companyName ? `${branding.companyName} Session Dashboard` : "Business Session Dashboard"}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mission-control__badge">
                    {analytics?.overview.lifecycleStatus === "in_progress" ? <span className="mission-control__pulse" /> : null}
                    {lifecycleLabel}
                  </span>
                  <span className="mission-control__badge">Game {gameCode || "--"}</span>
                  {branding?.brandThemeLabel ? <span className="mission-control__badge">{branding.brandThemeLabel}</span> : null}
                </div>
              </div>
            </div>
          </div>
          <div className="mission-control__panel p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mission-control__label">Updated</p>
                <p className="mt-1 text-sm text-[var(--mc-text-soft)]">{updatedAtLabel}</p>
              </div>
              <div>
                <p className="mission-control__label">Elapsed</p>
                <p className="mission-control__display mt-1 text-sm text-[var(--mc-text-soft)]">{durationLabel}</p>
              </div>
              <div>
                <p className="mission-control__label">Status</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: lifecycleTone }}>
                  {lifecycleLabel}
                </p>
              </div>
              <div>
                <p className="mission-control__label">Exports</p>
                <p className="mt-1 text-sm text-[var(--mc-text-soft)]">
                  {analyticsAccess?.allowedSections.exports ? "Ready" : "Locked"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="mission-control__button mission-control__button--primary" href={BUSINESS_ROUTES.createSession}>
                Start Session
              </Link>
              <button
                className="mission-control__button"
                disabled={exportStatus === "downloading" || !analyticsAccess?.allowedSections.exports}
                onClick={() => void callReportingExport("csv")}
                type="button"
              >
                {exportStatus === "downloading" ? "Exporting..." : "Export CSV"}
              </button>
              <button
                className="mission-control__button"
                disabled={exportStatus === "downloading" || !analyticsAccess?.allowedSections.exports}
                onClick={() => void callReportingExport("summary")}
                type="button"
              >
                {exportStatus === "downloading" ? "Exporting..." : "Download Summary"}
              </button>
            </div>
            {exportMessage ? <p className="mt-3 text-sm text-[var(--mc-alert)]">{exportMessage}</p> : null}
            {!analyticsAccess?.allowedSections.exports && guard.status === "allowed" && status === "ready" ? (
              <p className="mt-2 text-xs text-[var(--mc-text-muted)]">Exports unlock after the live session ends.</p>
            ) : null}
          </div>
        </div>
      </header>

      {(guard.status === "loading-auth" || guard.status === "checking-access") && (
        <section className="mission-control__panel p-6 text-sm text-[var(--mc-text-soft)]">
          Checking Business session access...
        </section>
      )}

      {guard.status === "unauthenticated" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
          Sign in to view this Business session dashboard.
        </section>
      )}

      {guard.status === "forbidden" && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          {guard.message ?? "This account is not authorized to manage this game."}
        </section>
      )}

      {guard.status === "error" && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          {guard.message ?? "Unable to verify Business session access right now."}
        </section>
      )}

      {guard.status === "allowed" && status === "loading" && (
        <section className="mission-control__panel p-6 text-sm text-[var(--mc-text-soft)]">
          Loading analytics...
        </section>
      )}

      {guard.status === "allowed" && status === "missing" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
          {statusMessage ?? "Aggregated analytics were not found for this game."}
        </section>
      )}

      {guard.status === "allowed" && status === "error" && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          {statusMessage ?? "Unable to load dashboard analytics right now."}
        </section>
      )}

      {guard.status === "allowed" && status === "ready" && analytics ? (
        <div className="grid gap-6">
          {isLiveLimited ? (
            <section className="mission-control__panel border-amber-300/40 bg-amber-900/20 p-4 text-sm text-amber-100">
              {analyticsAccess?.message ?? "Live analytics are enabled. Exports and final recommendations unlock after the session ends."}
            </section>
          ) : null}
          <div className="grid gap-6 xl:grid-cols-12">
            {analyticsAccess?.allowedSections.overview ? (
              <div className="xl:col-span-5">
                <GameOverviewPanel overview={analytics.overview} />
              </div>
            ) : null}
            <div className={analyticsAccess?.allowedSections.overview ? "xl:col-span-7" : "xl:col-span-12"}>
              {canShowInsights ? (
                <InsightCards insights={analytics.insights} />
              ) : (
                <LockedSection title="Activity Summary" message="Live analytics will populate as gameplay events occur." />
              )}
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-12">
            <div className="xl:col-span-8">
              {canShowPlayerPerformance ? (
                <PlayerPerformanceTable players={analytics.playerPerformance} mode={analytics.overview.mode} />
              ) : (
                <LockedSection title="Player Performance" message="No activity yet." />
              )}
            </div>
            <div className="grid gap-4 xl:col-span-4">
              {canShowSessionSummary ? (
                <>
                  <SessionSummary
                    summary={analytics.sessionSummary}
                    overview={analytics.overview}
                    insights={analytics.insights}
                    players={analytics.playerPerformance}
                  />
                  {canShowFinalRecommendations ? (
                    <ManagerRecommendations
                      summary={analytics.sessionSummary}
                      insights={analytics.insights}
                      players={analytics.playerPerformance}
                    />
                  ) : (
                    <LockedSection title="Final Recommendations" message="Final recommendations unlock after the live session ends." />
                  )}
                </>
              ) : (
                <LockedSection title="Session Summary" message="Live analytics will populate as gameplay events occur." />
              )}
            </div>
          </div>
          <div className="mission-control__panel p-2">
            <SessionTimeline gameCode={gameCode} />
          </div>
        </div>
      ) : null}

      {summaryModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md surface-light p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">{summaryModal.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{summaryModal.details}</p>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setSummaryModal((current) => ({ ...current, open: false }))}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

