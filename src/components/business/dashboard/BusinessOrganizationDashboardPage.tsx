"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessStatePanel from "@/components/business/BusinessStatePanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { clearClientCacheByPrefix, readClientCache, writeClientCache } from "@/lib/business/client-response-cache";
import {
  businessOrgRoute,
  businessOrgSettingsRoute,
  businessSessionGroupRoute,
  businessSessionRoute,
  businessSessionsRoute,
} from "@/lib/business/routes";
import { makeBusinessSessionGroupId } from "@/lib/business/session-groups";

type SessionRow = {
  sessionId: string | null;
  sessionType: "real" | "virtual";
  gameCode: string;
  gameCodes: string[];
  createdAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: string;
  playerCount: number;
  claims: number | null;
  disputes: number | null;
  successRate: number | null;
  disputeRate: number | null;
  avgResolutionTimeMs: number | null;
  isArchived: boolean;
  isDeleted: boolean;
  isEmptyCandidate: boolean;
  isAbandoned: boolean;
  analyticsAccess: {
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
};

type TrendRow = {
  index: number;
  gameCode: string;
  createdAt: string | null;
  successRate: number | null;
  disputeRate: number | null;
  avgResolutionTimeMs: number | null;
  analyticsAccess: SessionRow["analyticsAccess"];
};

type OrgDashboardData = {
  org: {
    orgId: string;
    name: string | null;
    ownershipSource: string;
    branding?: {
      companyName: string | null;
      companyLogoUrl: string | null;
      brandAccentColor: string | null;
      brandThemeLabel: string | null;
    } | null;
  };
  summary: {
    totalSessions: number;
    averageSuccessRate: number | null;
    averageDisputeRate: number | null;
    averageResolutionTimeMs: number | null;
    hiddenStaleSessionCount?: number | null;
  };
  trends: TrendRow[];
  sessions: SessionRow[];
};

type DashboardState =
  | { status: "loading-auth" }
  | { status: "unauthenticated"; message: string }
  | { status: "loading-data" }
  | { status: "forbidden"; message: string }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string }
  | { status: "allowed"; data: OrgDashboardData };

type ApiPayload = {
  org?: unknown;
  summary?: unknown;
  trends?: unknown;
  sessions?: unknown;
  message?: unknown;
};

type OrganizationDashboardPageProps = {
  orgId: string;
};

const ORG_DASHBOARD_CACHE_TTL_MS = 45_000;

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

function normalizePayload(payload: ApiPayload): OrgDashboardData {
  const orgRaw = payload.org && typeof payload.org === "object" ? (payload.org as Record<string, unknown>) : {};
  const sessionsRaw = Array.isArray(payload.sessions) ? payload.sessions : [];
  const summaryRaw = payload.summary && typeof payload.summary === "object" ? (payload.summary as Record<string, unknown>) : {};
  const trendsRaw = Array.isArray(payload.trends) ? payload.trends : [];

  const sessions: SessionRow[] = sessionsRaw.map((entry) => {
    const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      sessionId: asString(row.sessionId),
      sessionType: asString(row.sessionType) === "real" ? "real" : "virtual",
      gameCode: asString(row.gameCode) ?? "UNKNOWN",
      gameCodes: Array.isArray(row.gameCodes)
        ? row.gameCodes.map((value) => asString(value)).filter((value): value is string => value != null)
        : [],
      createdAt: asString(row.createdAt),
      startedAt: asString(row.startedAt),
      endedAt: asString(row.endedAt),
      status: asString(row.status) ?? "unknown",
      playerCount: asNumber(row.playerCount) ?? 0,
      claims: asNumber(row.claims),
      disputes: asNumber(row.disputes),
      successRate: asNumber(row.successRate),
      disputeRate: asNumber(row.disputeRate),
      avgResolutionTimeMs: asNumber(row.avgResolutionTimeMs),
      isArchived: asBoolean(row.isArchived),
      isDeleted: asBoolean(row.isDeleted),
      isEmptyCandidate: asBoolean(row.isEmptyCandidate),
      isAbandoned: asBoolean(row.isAbandoned),
      analyticsAccess:
        row.analyticsAccess && typeof row.analyticsAccess === "object"
          ? {
              visibility:
                asString((row.analyticsAccess as Record<string, unknown>).visibility) === "full_post_session"
                  ? "full_post_session"
                  : "limited_live",
              allowedSections:
                (row.analyticsAccess as Record<string, unknown>).allowedSections &&
                typeof (row.analyticsAccess as Record<string, unknown>).allowedSections === "object"
                  ? {
                      overview: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).overview
                      ),
                      insights: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).insights
                      ),
                      playerComparison: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).playerComparison
                      ),
                      sessionSummary: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).sessionSummary
                      ),
                      exports: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).exports
                      ),
                    }
                  : {
                      overview: true,
                      insights: false,
                      playerComparison: false,
                      sessionSummary: false,
                      exports: false,
                    },
              message: asString((row.analyticsAccess as Record<string, unknown>).message),
            }
          : {
              visibility: "limited_live",
              allowedSections: {
                overview: true,
                insights: false,
                playerComparison: false,
                sessionSummary: false,
                exports: false,
              },
              message: "Full analytics unlock after the session ends.",
            },
    };
  });

  const trends: TrendRow[] = trendsRaw.map((entry, index) => {
    const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      index: asNumber(row.index) ?? index + 1,
      gameCode: asString(row.gameCode) ?? "UNKNOWN",
      createdAt: asString(row.createdAt),
      successRate: asNumber(row.successRate),
      disputeRate: asNumber(row.disputeRate),
      avgResolutionTimeMs: asNumber(row.avgResolutionTimeMs),
      analyticsAccess:
        row.analyticsAccess && typeof row.analyticsAccess === "object"
          ? {
              visibility:
                asString((row.analyticsAccess as Record<string, unknown>).visibility) === "full_post_session"
                  ? "full_post_session"
                  : "limited_live",
              allowedSections:
                (row.analyticsAccess as Record<string, unknown>).allowedSections &&
                typeof (row.analyticsAccess as Record<string, unknown>).allowedSections === "object"
                  ? {
                      overview: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).overview
                      ),
                      insights: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).insights
                      ),
                      playerComparison: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).playerComparison
                      ),
                      sessionSummary: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).sessionSummary
                      ),
                      exports: Boolean(
                        ((row.analyticsAccess as Record<string, unknown>).allowedSections as Record<string, unknown>).exports
                      ),
                    }
                  : {
                      overview: true,
                      insights: false,
                      playerComparison: false,
                      sessionSummary: false,
                      exports: false,
                    },
              message: asString((row.analyticsAccess as Record<string, unknown>).message),
            }
          : {
              visibility: "limited_live",
              allowedSections: {
                overview: true,
                insights: false,
                playerComparison: false,
                sessionSummary: false,
                exports: false,
              },
              message: "Full analytics unlock after the session ends.",
            },
    };
  });

  return {
    org: {
      orgId: asString(orgRaw.orgId) ?? "",
      name: asString(orgRaw.name),
      ownershipSource: asString(orgRaw.ownershipSource) ?? "unknown",
      branding:
        orgRaw.branding && typeof orgRaw.branding === "object"
          ? {
              companyName: asString((orgRaw.branding as Record<string, unknown>).companyName),
              companyLogoUrl: asString((orgRaw.branding as Record<string, unknown>).companyLogoUrl),
              brandAccentColor: asString((orgRaw.branding as Record<string, unknown>).brandAccentColor),
              brandThemeLabel: asString((orgRaw.branding as Record<string, unknown>).brandThemeLabel),
            }
          : null,
    },
    summary: {
      totalSessions: asNumber(summaryRaw.totalSessions) ?? sessions.length,
      averageSuccessRate: asNumber(summaryRaw.averageSuccessRate),
      averageDisputeRate: asNumber(summaryRaw.averageDisputeRate),
      averageResolutionTimeMs: asNumber(summaryRaw.averageResolutionTimeMs),
      hiddenStaleSessionCount: asNumber(summaryRaw.hiddenStaleSessionCount),
    },
    trends,
    sessions,
  };
}

function formatDate(value: string | null): string {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${Math.round(value)}%`;
}

function formatDurationMs(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  const seconds = value / 1000;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainderSeconds}s`;
}

function displayMetric(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toLocaleString();
}

function statusLabel(rawStatus: string): string {
  const normalized = rawStatus.trim().toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized === "not_started") return "Pending";
  if (normalized === "in_progress") return "In Progress";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function orgLabel(name: string | null): string {
  return name?.trim() || "Unassigned Organisation";
}

export default function OrganizationDashboardPage({ orgId }: OrganizationDashboardPageProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<DashboardState>({ status: "loading-auth" });
  const [showTrend, setShowTrend] = useState(false);
  const [showEmptyStale, setShowEmptyStale] = useState(false);
  const [sessionQuery, setSessionQuery] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [cleanupStatus, setCleanupStatus] = useState<"idle" | "running">("idle");
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [cleanupDetails, setCleanupDetails] = useState<Array<{ gameCode: string; reason: string }>>([]);
  const [showLoadingHint, setShowLoadingHint] = useState(false);

  useEffect(() => {
    const normalizedOrgId = orgId.trim();
    if (!normalizedOrgId) {
      setState({ status: "not-found", message: "Organization not found." });
      return;
    }

    if (loading) {
      setState({ status: "loading-auth" });
      return;
    }

    if (!user) {
      setState({ status: "unauthenticated", message: "Sign in to access this organization dashboard." });
      return;
    }

    let isCancelled = false;

    const load = async () => {
      const query = showEmptyStale ? "?includeEmpty=1" : "";
      const cacheKey = `business.org.dashboard.v2.${normalizedOrgId}.${query || "default"}`;
      const cached = readClientCache<ApiPayload>(cacheKey, ORG_DASHBOARD_CACHE_TTL_MS);
      const hasCachedData = Boolean(cached?.org && cached?.sessions);
      if (hasCachedData) {
        setState({ status: "allowed", data: normalizePayload(cached as ApiPayload) });
      } else {
        setState({ status: "loading-data" });
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/orgs/${encodeURIComponent(normalizedOrgId)}/sessions${query}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => ({}))) as ApiPayload;
        const message = asString(payload.message) ?? "Unable to load organization sessions.";
        if (isCancelled) return;

        if (response.ok) {
          writeClientCache(cacheKey, payload);
          setSelectedGames([]);
          setState({ status: "allowed", data: normalizePayload(payload) });
          return;
        }

        if (hasCachedData) return;
        if (response.status === 401) {
          setState({ status: "unauthenticated", message });
          return;
        }

        if (response.status === 403) {
          setState({ status: "forbidden", message });
          return;
        }

        if (response.status === 404) {
          setState({ status: "not-found", message });
          return;
        }

        setState({ status: "error", message });
      } catch {
        if (isCancelled) return;
        if (hasCachedData) return;
        setState({ status: "error", message: "Unable to load organization sessions." });
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [loading, orgId, showEmptyStale, user]);

  useEffect(() => {
    if (state.status !== "unauthenticated") return;
    const next = encodeURIComponent(businessOrgRoute(orgId.trim()));
    router.replace(`/login?next=${next}`);
  }, [orgId, router, state.status]);

  useEffect(() => {
    if (state.status !== "loading-auth" && state.status !== "loading-data") {
      setShowLoadingHint(false);
      return;
    }

    const timer = window.setTimeout(() => setShowLoadingHint(true), 350);
    return () => window.clearTimeout(timer);
  }, [state.status]);

  const orgName = useMemo(() => {
    if (state.status !== "allowed") return null;
    return state.data.org.branding?.companyName ?? state.data.org.name ?? "Unassigned Organisation";
  }, [state]);

  const toggleSelection = (gameCode: string, checked: boolean) => {
    setSelectedGames((current) => {
      if (checked) {
        if (current.includes(gameCode)) return current;
        return [...current, gameCode];
      }
      return current.filter((value) => value !== gameCode);
    });
  };

  const runCleanup = async (action: "archive_selected_empty" | "delete_selected_empty") => {
    if (!user || selectedGames.length === 0 || state.status !== "allowed") return;
    setCleanupStatus("running");
    setCleanupMessage(null);
    setCleanupDetails([]);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/orgs/${encodeURIComponent(state.data.org.orgId)}/sessions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action,
          gameCodes: selectedGames,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: unknown;
        updatedCount?: unknown;
        updatedCodes?: unknown;
        skippedCount?: unknown;
        skippedDetails?: unknown;
      };

      if (!response.ok) {
        setCleanupMessage(asString(payload.message) ?? "Unable to clean up selected sessions.");
        return;
      }

      const updatedCount = asNumber(payload.updatedCount) ?? 0;
      const skippedCount = asNumber(payload.skippedCount) ?? 0;
      const skippedDetails = Array.isArray(payload.skippedDetails)
        ? payload.skippedDetails
            .map((entry) => {
              const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
              const gameCode = asString(row.gameCode);
              const reason = asString(row.reason);
              if (!gameCode || !reason) return null;
              return { gameCode, reason };
            })
            .filter((value): value is { gameCode: string; reason: string } => value != null)
        : [];
      const updatedCodes = Array.isArray(payload.updatedCodes)
        ? payload.updatedCodes.map((value) => asString(value)).filter((value): value is string => value != null)
        : [];
      const removedGameCodes = new Set((updatedCodes.length > 0 ? updatedCodes : selectedGames).map((value) => value.toUpperCase()));

      setState((current) => {
        if (current.status !== "allowed" || removedGameCodes.size === 0) return current;
        const nextSessions = current.data.sessions.filter((session) => !removedGameCodes.has(session.gameCode.toUpperCase()));
        const nextTrends = current.data.trends
          .filter((trend) => !removedGameCodes.has(trend.gameCode.toUpperCase()))
          .map((trend, index) => ({ ...trend, index: index + 1 }));
        const nextHiddenStaleSessionCount = nextSessions.filter((session) => session.isAbandoned && !session.isArchived && !session.isDeleted).length;
        return {
          status: "allowed",
          data: {
            ...current.data,
            sessions: nextSessions,
            trends: nextTrends,
            summary: {
              ...current.data.summary,
              totalSessions: nextSessions.length,
              hiddenStaleSessionCount: nextHiddenStaleSessionCount,
            },
          },
        };
      });

      setCleanupMessage(
        skippedCount > 0
          ? `Updated ${updatedCount} sessions. Skipped ${skippedCount}.`
          : `Updated ${updatedCount} sessions.`
      );
      setCleanupDetails(skippedDetails);
      clearClientCacheByPrefix(`business.org.dashboard.v2.${state.data.org.orgId}.`);
      setSelectedGames([]);
      setShowEmptyStale(false);
    } catch {
      setCleanupMessage("Unable to clean up selected sessions.");
    } finally {
      setCleanupStatus("idle");
    }
  };

  const visibleEmptyGameCodes =
    state.status === "allowed" ? state.data.sessions.filter((session) => session.isEmptyCandidate).map((session) => session.gameCode) : [];

  const allVisibleEmptySelected =
    visibleEmptyGameCodes.length > 0 && visibleEmptyGameCodes.every((gameCode) => selectedGames.includes(gameCode));

  const filteredSessions =
    state.status === "allowed"
      ? state.data.sessions.filter((session) => {
          const query = sessionQuery.trim().toLowerCase();
          if (!query) return true;
          const text = `${session.gameCode} ${session.status} ${session.createdAt ?? ""}`.toLowerCase();
          return text.includes(query);
        })
      : [];

  return (
    <div className="biz-dark biz-exec mc-rhythm-16 p-3 md:p-4">
      <section
        className="biz-sessions-shell"
        style={
          state.status === "allowed" && state.data.org.branding?.brandAccentColor
            ? { borderTopWidth: "3px", borderTopColor: state.data.org.branding.brandAccentColor }
            : undefined
        }
      >
        <header className="biz-sessions-toolbar">
          <div className="flex items-center gap-3">
            {state.status === "allowed" && state.data.org.branding?.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.data.org.branding.companyLogoUrl}
                alt={`${orgName ?? "Organization"} logo`}
                className="h-10 w-10 rounded object-contain"
              />
            ) : null}
            <div>
              <p className="biz-label">Organisation Board</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Organization Dashboard</h1>
              {state.status === "allowed" ? (
                <p className="mt-1 text-sm text-slate-600">Organization: {orgLabel(orgName)}</p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">Loading organisation context...</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link className="font-medium text-blue-700 hover:text-blue-900" href={businessSessionsRoute()}>
              Open Sessions
            </Link>
            <Link className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900" href={businessOrgSettingsRoute(orgId)}>
              Organisation Settings
            </Link>
          </div>
        </header>

        {(state.status === "loading-auth" || state.status === "loading-data") && showLoadingHint ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="loading" title="Loading Organization Sessions" message="Fetching organisation session analytics..." />
          </div>
        ) : null}

        {state.status === "unauthenticated" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="error" title="Sign In Required" message={state.message} />
          </div>
        ) : null}
        {state.status === "forbidden" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="error" title="Access Denied" message={state.message} />
          </div>
        ) : null}
        {state.status === "not-found" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="empty" title="Organisation Not Found" message={state.message} />
          </div>
        ) : null}
        {state.status === "error" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="error" title="Unable To Load Organisation Sessions" message={state.message} />
          </div>
        ) : null}

        {state.status === "allowed" ? (
          state.data.sessions.length > 0 ? (
            <>
              <section className="biz-sessions-block">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Multi-Session Summary</h2>
                </div>
                <div className="mt-3 border-t border-slate-400/25 pt-3">
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-500">Total Sessions</dt>
                      <dd className="mt-0.5 text-base font-semibold text-slate-900">{state.data.summary.totalSessions.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-500">Average Success</dt>
                      <dd className="mt-0.5 text-base font-semibold text-slate-900">{formatPercent(state.data.summary.averageSuccessRate)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-500">Average Dispute</dt>
                      <dd className="mt-0.5 text-base font-semibold text-slate-900">{formatPercent(state.data.summary.averageDisputeRate)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-500">Avg Resolution</dt>
                      <dd className="mt-0.5 text-base font-semibold text-slate-900">{formatDurationMs(state.data.summary.averageResolutionTimeMs)}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-wide text-slate-500">Hidden Stale</dt>
                      <dd className="mt-0.5 text-base font-semibold text-slate-900">
                        {(state.data.summary.hiddenStaleSessionCount ?? 0).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="biz-sessions-block">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">Session Trend</h2>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                      onClick={() => setShowTrend((current) => !current)}
                      type="button"
                    >
                      {showTrend ? "Hide Trend" : "Show Trend"}
                    </button>
                  </div>
                  {showTrend ? (
                    <div className="mt-3 overflow-x-auto">
                      <table className="biz-data-table biz-sessions-table min-w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th>#</th>
                            <th>Game</th>
                            <th>Created</th>
                            <th>Success</th>
                            <th>Dispute</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.data.trends.map((trend) => (
                            <tr key={`${trend.gameCode}-${trend.index}`} className="text-slate-700">
                              <td>{trend.index}</td>
                              <td className="whitespace-nowrap font-medium text-slate-900">{trend.gameCode}</td>
                              <td className="whitespace-nowrap">{formatDate(trend.createdAt)}</td>
                              <td>{trend.analyticsAccess.allowedSections.insights ? formatPercent(trend.successRate) : "Locked"}</td>
                              <td>{trend.analyticsAccess.allowedSections.insights ? formatPercent(trend.disputeRate) : "Locked"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Trend is hidden by default to keep focus on active operational sessions.</p>
                  )}
              </section>

              <section className="biz-sessions-block">
                <h2 className="text-lg font-semibold text-slate-900">Recent Sessions</h2>
                <div className="mt-3">
                  <input
                    className="biz-input text-sm"
                    onChange={(event) => setSessionQuery(event.target.value)}
                    placeholder="Filter by game code or status"
                    value={sessionQuery}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      checked={showEmptyStale}
                      className="h-4 w-4 rounded border-slate-300"
                      onChange={(event) => setShowEmptyStale(event.target.checked)}
                      type="checkbox"
                    />
                    Show Empty/Stale
                  </label>
                  {selectedGames.length > 0 ? (
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={cleanupStatus === "running" || selectedGames.length === 0}
                      onClick={() => void runCleanup("archive_selected_empty")}
                      type="button"
                    >
                      {cleanupStatus === "running" ? "Applying..." : "Archive Selected Empty"}
                    </button>
                  ) : null}
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={cleanupStatus === "running" || visibleEmptyGameCodes.length === 0}
                    onClick={() => setSelectedGames(allVisibleEmptySelected ? [] : visibleEmptyGameCodes)}
                    type="button"
                  >
                    {allVisibleEmptySelected ? "Clear" : "Select All Empty"}
                  </button>
                  {selectedGames.length > 0 ? (
                    <button
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={cleanupStatus === "running" || selectedGames.length === 0}
                      onClick={() => void runCleanup("delete_selected_empty")}
                      type="button"
                    >
                      {cleanupStatus === "running" ? "Applying..." : "Hide Selected Empty"}
                    </button>
                  ) : null}
                  {cleanupMessage ? <p className="text-sm text-slate-600">{cleanupMessage}</p> : null}
                </div>
                {cleanupDetails.length > 0 ? (
                  <div className="mt-2 rounded-md border border-slate-300/50 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
                    <p className="font-semibold text-slate-200">Skipped details</p>
                    <ul className="mt-1 grid gap-1">
                      {cleanupDetails.slice(0, 8).map((entry) => (
                        <li key={`${entry.gameCode}-${entry.reason}`}>
                          <span className="font-medium text-slate-100">{entry.gameCode}</span>:{" "}
                          {entry.reason === "not_empty_or_active" ? "has activity or already started" : "game not found"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-3 overflow-x-auto">
                  <table className="biz-data-table biz-sessions-table min-w-full text-sm">
                    <colgroup>
                      <col style={{ width: "3.5rem" }} />
                      <col style={{ width: "7rem" }} />
                      <col style={{ width: "17rem" }} />
                      <col style={{ width: "11rem" }} />
                      <col style={{ width: "5rem" }} />
                      <col style={{ width: "11rem" }} />
                      <col style={{ width: "10rem" }} />
                    </colgroup>
                    <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th>Select</th>
                        <th>Game Code</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Players</th>
                        <th>Performance</th>
                        <th>Session Dashboard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((session) => (
                        <tr key={session.gameCode} className="text-slate-700">
                          <td>
                            <input
                              checked={selectedGames.includes(session.gameCode)}
                              className="h-4 w-4 rounded border-slate-300"
                              disabled={!session.isEmptyCandidate}
                              onChange={(event) => toggleSelection(session.gameCode, event.target.checked)}
                              type="checkbox"
                            />
                          </td>
                          <td className="whitespace-nowrap font-medium text-slate-900">{session.gameCode}</td>
                          <td className="whitespace-nowrap">
                            {statusLabel(session.status)}
                            {session.isAbandoned ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Abandoned</span> : null}
                            <div className="mt-0.5 text-xs text-slate-500">
                              Start {formatDate(session.startedAt)} · End {formatDate(session.endedAt)}
                            </div>
                          </td>
                          <td className="whitespace-nowrap">{formatDate(session.createdAt)}</td>
                          <td className="whitespace-nowrap">{session.playerCount.toLocaleString()}</td>
                          <td className="whitespace-nowrap">
                            {session.analyticsAccess.allowedSections.insights
                              ? `S ${formatPercent(session.successRate)} · C ${displayMetric(session.claims)} · D ${displayMetric(session.disputes)}`
                              : "Locked"}
                          </td>
                          <td className="whitespace-nowrap align-top">
                            {session.analyticsAccess.allowedSections.overview ? (
                              <div className="flex flex-col gap-1">
                                <Link
                                  className="font-medium text-blue-700 hover:text-blue-900"
                                  href={businessSessionGroupRoute(
                                    session.sessionId ??
                                      makeBusinessSessionGroupId({
                                        type: "virtual",
                                        orgId: state.data.org.orgId,
                                        sessionKey: `game:${session.gameCode}`,
                                      })
                                  )}
                                >
                                  Open Session
                                </Link>
                                <Link className="text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900" href={businessSessionRoute(session.gameCode)}>
                                  Open Game
                                </Link>
                              </div>
                            ) : (
                              <span className="text-slate-500">Unavailable</span>
                            )}
                            {session.analyticsAccess.message ? <p className="mt-1 text-xs text-amber-700">{session.analyticsAccess.message}</p> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="biz-sessions-block">
              <BusinessStatePanel tone="empty" title="No Sessions Yet" message="This organisation has no sessions yet." />
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}


