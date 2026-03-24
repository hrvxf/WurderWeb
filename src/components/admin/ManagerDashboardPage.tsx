"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import GameOverviewPanel from "@/components/admin/GameOverviewPanel";
import InsightCards from "@/components/admin/InsightCards";
import PlayerPerformanceTable from "@/components/admin/PlayerPerformanceTable";
import SessionSummary from "@/components/admin/SessionSummary";
import ManagerRecommendations from "@/components/admin/ManagerRecommendations";
import SessionTimeline from "@/components/admin/SessionTimeline";
import { computeAccuracy, computeDisputeRate, computeDurationMs, computeKd, toNullableNumber } from "@wurder/shared-analytics";
import type { DashboardResponse, PlayerPerformance } from "@wurder/shared-analytics";
import type { ManagerInsight } from "@/components/admin/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useManagerRouteGuard } from "@/lib/auth/use-manager-route-guard";

type ManagerDashboardPageProps = {
  gameCode: string;
};

type ManagerBranding = {
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
};

type AnalyticsAccessState = {
  visibility: "limited_live" | "full_post_session";
  allowedSections: {
    overview: boolean;
    insights: boolean;
    playerComparison: boolean;
    sessionSummary: boolean;
    exports: boolean;
  };
  message: string | null;
};

function LockedSection({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-900">{title}</h2>
      <p className="mt-2 text-sm text-amber-900">{message}</p>
    </section>
  );
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

type ManagerOverview = {
  gameCode: string;
  gameName: string;
  status: string;
  mode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
};

type ManagerSessionSummary = {
  totalSessions: number;
  avgSessionLengthSeconds: number | null;
  longestSessionSeconds: number | null;
  lastSessionAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

type ManagerAnalyticsDocument = {
  dashboard: DashboardResponse;
  overview: ManagerOverview;
  insights: ManagerInsight[];
  playerPerformance: PlayerPerformance[];
  sessionSummary: ManagerSessionSummary;
  updatedAt: string | null;
};

function normalizeOverview(value: unknown, gameCode: string): ManagerOverview {
  const overview = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    gameCode,
    gameName: parseString(overview.gameName),
    status: parseString(overview.status) || "unknown",
    mode: parseNullableString(overview.mode),
    startedAt: parseNullableString(overview.startedAt),
    endedAt: parseNullableString(overview.endedAt),
    totalPlayers: parseNumber(overview.totalPlayers),
    activePlayers: parseNumber(overview.activePlayers),
    totalSessions: parseNumber(overview.totalSessions),
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
      .map((item) => {
        const insight = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          label: formatInsightLabel(parseString(insight.label)),
          value: parseNumber(insight.value),
          message: parseNullableString(insight.message),
          triggeredBy: normalizeTriggeredBy(insight.triggeredBy),
        };
      })
      .filter((item) => item.label.length > 0);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, insightValue]) => ({
        label: formatInsightLabel(parseString(label)),
        value: parseNumber(insightValue),
        message: null,
      }))
      .filter((item) => item.label.length > 0);
  }

  return [];
}

function normalizePlayers(value: unknown): PlayerPerformance[] {
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
    return {
      playerId: parseString(player.playerId) || `row-${index}`,
      playerName: parseString(player.playerName) || parseString(player.displayName) || "Unknown",
      userId: parseNullableString(player.userId),
      kills: kills ?? undefined,
      confirmedKills: confirmedKills ?? undefined,
      deaths: deaths ?? 0,
      kd: parseNullableNumber(player.kd) ?? (kills != null && deaths != null ? computeKd(kills, deaths) : null),
      accuracy:
        parseNullableNumber(player.accuracy) ??
        parseNullableNumber(player.successRate) ??
        (confirmedKills != null && claims != null ? computeAccuracy(confirmedKills, claims) : null),
      successRate: parseNullableNumber(player.successRate) ?? parseNullableNumber(player.accuracy),
      claims: claims ?? undefined,
      disputes: disputes ?? undefined,
      disputeRate:
        parseNullableNumber(player.disputeRate) ??
        (disputes != null && claims != null ? computeDisputeRate(disputes, claims) : null),
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
    const next = encodeURIComponent(`/manager/${gameCode.trim()}`);
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

        const response = await fetch(`/api/manager/games/${encodeURIComponent(normalizedCode)}/dashboard`, {
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
      const response = await fetch(`/api/manager/games/${encodeURIComponent(normalizedCode)}/export?format=${encodeURIComponent(format)}`, {
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        style={branding?.brandAccentColor ? { borderTopWidth: "4px", borderTopColor: branding.brandAccentColor } : undefined}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {branding?.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.companyLogoUrl} alt={`${branding.companyName ?? "Company"} logo`} className="h-10 w-10 rounded object-contain" />
            ) : null}
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {branding?.companyName ? `${branding.companyName} Manager Dashboard` : "Manager Dashboard V2"}
              </h1>
              {branding?.brandThemeLabel ? <p className="text-xs uppercase tracking-wide text-slate-500">Theme: {branding.brandThemeLabel}</p> : null}
              <p className="text-sm text-slate-600">Game code: {gameCode || "--"}</p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Updated: {updatedAtLabel}</p>
        </div>
      </header>

      {guard.status === "allowed" && status === "ready" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Reporting Exports</h2>
            {analyticsAccess?.allowedSections.exports ? (
              <>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={exportStatus === "downloading"}
                  onClick={() => void callReportingExport("csv")}
                  type="button"
                >
                  {exportStatus === "downloading" ? "Exporting..." : "Export CSV"}
                </button>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={exportStatus === "downloading"}
                  onClick={() => void callReportingExport("summary")}
                  type="button"
                >
                  {exportStatus === "downloading" ? "Exporting..." : "Download Summary"}
                </button>
              </>
            ) : (
              <p className="text-sm text-amber-900">Exports unlock after the live session ends.</p>
            )}
          </div>
          {exportMessage ? <p className="mt-2 text-sm text-red-700">{exportMessage}</p> : null}
        </section>
      ) : null}

      {(guard.status === "loading-auth" || guard.status === "checking-access") && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Checking manager access...
        </section>
      )}

      {guard.status === "unauthenticated" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
          Sign in to view this manager dashboard.
        </section>
      )}

      {guard.status === "forbidden" && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          {guard.message ?? "This account is not authorized to manage this game."}
        </section>
      )}

      {guard.status === "error" && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          {guard.message ?? "Unable to verify manager access right now."}
        </section>
      )}

      {guard.status === "allowed" && status === "loading" && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
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
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
              {analyticsAccess?.message ?? "Live session mode is active. Additional analytics unlock after the session ends."}
            </section>
          ) : null}
          {analyticsAccess?.allowedSections.overview ? <GameOverviewPanel overview={analytics.overview} /> : null}
          {analyticsAccess?.allowedSections.insights ? (
            <InsightCards insights={analytics.insights} />
          ) : (
            <LockedSection title="Activity Summary" message="Insights are locked until the session has ended." />
          )}
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            {analyticsAccess?.allowedSections.playerComparison ? (
              <PlayerPerformanceTable players={analytics.playerPerformance} mode={analytics.overview.mode} />
            ) : (
              <LockedSection title="Player Performance" message="Player comparison unlocks after the session ends." />
            )}
            {analyticsAccess?.allowedSections.sessionSummary ? (
              <div className="grid gap-4">
                <SessionSummary
                  summary={analytics.sessionSummary}
                  overview={analytics.overview}
                  insights={analytics.insights}
                  players={analytics.playerPerformance}
                />
                <ManagerRecommendations
                  summary={analytics.sessionSummary}
                  insights={analytics.insights}
                  players={analytics.playerPerformance}
                />
              </div>
            ) : (
              <LockedSection title="Session Summary" message="Session summary and recommendations unlock after the session ends." />
            )}
          </div>
          <SessionTimeline
            gameCode={gameCode}
            isLocked={isLiveLimited}
            lockedMessage="Timeline events become available after the session ends."
          />
        </div>
      ) : null}

      {summaryModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
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
