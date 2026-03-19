"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import GameOverviewPanel from "@/components/admin/GameOverviewPanel";
import InsightCards from "@/components/admin/InsightCards";
import PlayerPerformanceTable from "@/components/admin/PlayerPerformanceTable";
import SessionSummary from "@/components/admin/SessionSummary";
import type {
  ManagerAnalyticsDocument,
  ManagerGameOverview,
  ManagerInsight,
  ManagerPlayerPerformance,
  ManagerSessionSummary,
} from "@/components/admin/types";
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

function normalizeOverview(value: unknown, gameCode: string): ManagerGameOverview {
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
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const insight = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          label: formatInsightLabel(parseString(insight.label)),
          value: parseNumber(insight.value),
        };
      })
      .filter((item) => item.label.length > 0);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, insightValue]) => ({
        label: formatInsightLabel(parseString(label)),
        value: parseNumber(insightValue),
      }))
      .filter((item) => item.label.length > 0);
  }

  return [];
}

function normalizePlayers(value: unknown): ManagerPlayerPerformance[] {
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
    return {
      playerId: parseString(player.playerId) || `row-${index}`,
      displayName: parseString(player.displayName) || "Unknown",
      kills: parseNullableNumber(player.kills),
      deaths: parseNullableNumber(player.deaths),
      kdRatio: parseNullableNumber(player.kdRatio),
      accuracyPct: parseNullableNumber(player.accuracyPct),
      sessionCount: parseNullableNumber(player.sessionCount),
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
  };
}

function normalizeAnalytics(value: unknown, gameCode: string): ManagerAnalyticsDocument {
  const analytics = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    overview: normalizeOverview(analytics.overview, gameCode),
    insights: normalizeInsights(analytics.insights),
    playerPerformance: normalizePlayers(analytics.playerPerformance),
    sessionSummary: normalizeSessionSummary(analytics.sessionSummary),
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
  const [entitlements, setEntitlements] = useState<{
    managerInsights: boolean;
    managerSummaries: boolean;
    exports: boolean;
  } | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "downloading">("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
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
      setEntitlements(null);
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
          entitlements?: unknown;
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
        const normalizedEntitlements =
            payload.entitlements && typeof payload.entitlements === "object"
              ? (payload.entitlements as Record<string, unknown>)
              : {};
          setEntitlements({
            managerInsights: Boolean(normalizedEntitlements.managerInsights),
            managerSummaries: Boolean(normalizedEntitlements.managerSummaries),
            exports: Boolean(normalizedEntitlements.exports),
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

  const downloadExport = async (format: "csv" | "pdf") => {
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
      const response = await fetch(
        `/api/manager/games/${encodeURIComponent(normalizedCode)}/export?format=${encodeURIComponent(format)}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: unknown };
        setExportMessage(parseString(errorPayload.message) || "Unable to export report.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const extension = format === "csv" ? "csv" : "html";
      anchor.href = objectUrl;
      anchor.download = `session-report-${normalizedCode.toUpperCase()}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[manager] Export failed", {
          gameCode: normalizedCode,
          format,
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
            {entitlements?.exports ? (
              <>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={exportStatus === "downloading"}
                  onClick={() => void downloadExport("csv")}
                  type="button"
                >
                  {exportStatus === "downloading" ? "Exporting..." : "Export CSV"}
                </button>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={exportStatus === "downloading"}
                  onClick={() => void downloadExport("pdf")}
                  type="button"
                >
                  {exportStatus === "downloading" ? "Exporting..." : "Export PDF-ready"}
                </button>
              </>
            ) : (
              <p className="text-sm text-amber-900">Exports are available on Enterprise tier.</p>
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
          <GameOverviewPanel overview={analytics.overview} />
          {entitlements?.managerInsights ? (
            <InsightCards insights={analytics.insights} />
          ) : (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
              Insights are available on Pro and Enterprise tiers.
            </section>
          )}
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <PlayerPerformanceTable players={analytics.playerPerformance} mode={analytics.overview.mode} />
            {entitlements?.managerSummaries ? (
              <SessionSummary
                summary={analytics.sessionSummary}
                overview={analytics.overview}
                insights={analytics.insights}
                players={analytics.playerPerformance}
              />
            ) : (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
                Session summaries are available on Pro and Enterprise tiers.
              </section>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
