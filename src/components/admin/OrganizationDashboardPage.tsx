"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthProvider";
import { businessOrgRoute, businessSessionRoute } from "@/lib/business/routes";

type SessionRow = {
  gameCode: string;
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

function normalizePayload(payload: ApiPayload): OrgDashboardData {
  const orgRaw = payload.org && typeof payload.org === "object" ? (payload.org as Record<string, unknown>) : {};
  const sessionsRaw = Array.isArray(payload.sessions) ? payload.sessions : [];
  const summaryRaw = payload.summary && typeof payload.summary === "object" ? (payload.summary as Record<string, unknown>) : {};
  const trendsRaw = Array.isArray(payload.trends) ? payload.trends : [];

  const sessions: SessionRow[] = sessionsRaw.map((entry) => {
    const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      gameCode: asString(row.gameCode) ?? "UNKNOWN",
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
  if (normalized === "not_started") return "Not Started";
  if (normalized === "in_progress") return "In Progress";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function OrganizationDashboardPage({ orgId }: OrganizationDashboardPageProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<DashboardState>({ status: "loading-auth" });

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
      setState({ status: "loading-data" });
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/orgs/${encodeURIComponent(normalizedOrgId)}/sessions`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => ({}))) as ApiPayload;
        const message = asString(payload.message) ?? "Unable to load organization sessions.";
        if (isCancelled) return;

        if (response.ok) {
          setState({ status: "allowed", data: normalizePayload(payload) });
          return;
        }

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
        setState({ status: "error", message: "Unable to load organization sessions." });
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [loading, orgId, user]);

  useEffect(() => {
    if (state.status !== "unauthenticated") return;
    const next = encodeURIComponent(businessOrgRoute(orgId.trim()));
    router.replace(`/login?next=${next}`);
  }, [orgId, router, state.status]);

  const orgName = useMemo(() => {
    if (state.status !== "allowed") return null;
    return state.data.org.branding?.companyName ?? state.data.org.name ?? state.data.org.orgId;
  }, [state]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header
        className="surface-light p-4"
        style={
          state.status === "allowed" && state.data.org.branding?.brandAccentColor
            ? { borderTopWidth: "4px", borderTopColor: state.data.org.branding.brandAccentColor }
            : undefined
        }
      >
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
            <h1 className="text-2xl font-semibold text-slate-900">Organization Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Organization: {orgName ?? orgId}</p>
            {state.status === "allowed" && state.data.org.branding?.brandThemeLabel ? (
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Theme: {state.data.org.branding.brandThemeLabel}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {state.status === "loading-auth" || state.status === "loading-data" ? (
        <section className="surface-light p-6 text-sm text-slate-600">
          Loading organization sessions...
        </section>
      ) : null}

      {state.status === "unauthenticated" ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
          {state.message}
        </section>
      ) : null}

      {state.status === "forbidden" ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          {state.message}
        </section>
      ) : null}

      {state.status === "not-found" ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
          {state.message}
        </section>
      ) : null}

      {state.status === "error" ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          {state.message}
        </section>
      ) : null}

      {state.status === "allowed" ? (
        state.data.sessions.length > 0 ? (
          <div className="space-y-6">
            <section className="surface-light p-4">
              <h2 className="text-lg font-semibold text-slate-900">Multi-Session Summary</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <article className="surface-light-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Sessions</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{state.data.summary.totalSessions.toLocaleString()}</p>
                </article>
                <article className="surface-light-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Avg Success Rate</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatPercent(state.data.summary.averageSuccessRate)}</p>
                </article>
                <article className="surface-light-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Avg Dispute Rate</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatPercent(state.data.summary.averageDisputeRate)}</p>
                </article>
                <article className="surface-light-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Avg Resolution Time</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{formatDurationMs(state.data.summary.averageResolutionTimeMs)}</p>
                </article>
              </div>
            </section>

            <section className="surface-light p-4">
              <h2 className="text-lg font-semibold text-slate-900">Session Trend</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Session</th>
                      <th className="px-3 py-2">Game</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Success Rate</th>
                      <th className="px-3 py-2">Dispute Rate</th>
                      <th className="px-3 py-2">Avg Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.data.trends.map((trend) => (
                      <tr key={`${trend.gameCode}-${trend.index}`} className="text-slate-700">
                        <td className="px-3 py-2">{trend.index}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{trend.gameCode}</td>
                        <td className="whitespace-nowrap px-3 py-2">{formatDate(trend.createdAt)}</td>
                        <td className="px-3 py-2">
                          {trend.analyticsAccess.allowedSections.insights ? formatPercent(trend.successRate) : "Locked"}
                        </td>
                        <td className="px-3 py-2">
                          {trend.analyticsAccess.allowedSections.insights ? formatPercent(trend.disputeRate) : "Locked"}
                        </td>
                        <td className="px-3 py-2">
                          {trend.analyticsAccess.allowedSections.sessionSummary ? formatDurationMs(trend.avgResolutionTimeMs) : "Locked"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="surface-light p-4">
              <h2 className="text-lg font-semibold text-slate-900">Recent Sessions</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Game Code</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Session Dates</th>
                      <th className="px-3 py-2">Players</th>
                      <th className="px-3 py-2">Claims</th>
                      <th className="px-3 py-2">Disputes</th>
                      <th className="px-3 py-2">Success Rate</th>
                      <th className="px-3 py-2">Session Dashboard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.data.sessions.map((session) => (
                      <tr key={session.gameCode} className="text-slate-700">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{session.gameCode}</td>
                        <td className="whitespace-nowrap px-3 py-2">{formatDate(session.createdAt)}</td>
                        <td className="whitespace-nowrap px-3 py-2">{statusLabel(session.status)}</td>
                        <td className="px-3 py-2">
                          <div>Start: {formatDate(session.startedAt)}</div>
                          <div>End: {formatDate(session.endedAt)}</div>
                        </td>
                        <td className="px-3 py-2">{session.playerCount.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          {session.analyticsAccess.allowedSections.insights ? displayMetric(session.claims) : "Locked"}
                        </td>
                        <td className="px-3 py-2">
                          {session.analyticsAccess.allowedSections.insights ? displayMetric(session.disputes) : "Locked"}
                        </td>
                        <td className="px-3 py-2">
                          {session.analyticsAccess.allowedSections.insights ? formatPercent(session.successRate) : "Locked"}
                        </td>
                        <td className="px-3 py-2">
                          {session.analyticsAccess.allowedSections.overview ? (
                            <Link className="font-medium text-blue-700 hover:text-blue-900" href={businessSessionRoute(session.gameCode)}>
                              Open
                            </Link>
                          ) : (
                            <span className="text-slate-500">Unavailable</span>
                          )}
                          {session.analyticsAccess.message ? (
                            <p className="mt-1 text-xs text-amber-700">{session.analyticsAccess.message}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          <section className="surface-light p-6 text-sm text-slate-600">
            This organization has no sessions yet.
          </section>
        )
      ) : null}
    </div>
  );
}

