"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessStatePanel from "@/components/business/BusinessStatePanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { readClientCache, writeClientCache } from "@/lib/business/client-response-cache";
import {
  businessOrgRoute,
  businessSessionGroupExportApiRoute,
  businessSessionPlayerRoute,
  businessSessionRoute,
} from "@/lib/business/routes";
import { parseBusinessSessionGroupId } from "@/lib/business/session-groups";

type SessionGameRow = {
  gameCode: string;
  createdAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

type SessionRow = {
  sessionGroupId: string;
  sessionId: string;
  sessionType: "real" | "virtual";
  sourceSessionId: string | null;
  title: string | null;
  derivedName: string;
  status: "not_started" | "in_progress" | "ended";
  createdAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  gameCodes: string[];
  games: SessionGameRow[];
  gameCount: number;
  summary: {
    playerCount: number;
    startAt: string | null;
    endAt: string | null;
  };
  migration: {
    isVirtualSession: boolean;
    identityNeedsReview: boolean;
    identitySource: string;
    identityConfidence: "high" | "medium" | "low";
  };
  health: {
    joinRate: number | null;
    completionRate: number | null;
    dropOffRate: number | null;
    status: "healthy" | "watch" | "at_risk" | "insufficient_data";
    indicators: string[];
  };
  insights: Array<{
    id: string;
    title: string;
    summary: string;
    severity: "info" | "warning" | "critical";
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    level: "warning" | "critical";
  }>;
  notes: {
    session: {
      text: string;
      updatedAt: string | null;
      updatedBy: string | null;
    };
    players: Array<{
      playerId: string;
      displayName: string;
      notes: string;
      updatedAt: string | null;
      primaryGameCode: string;
    }>;
  };
  timelinePreview: Array<{
    id: string;
    occurredAt: string | null;
    label: string;
    type: string;
    gameCode: string;
  }>;
  players: Array<{
    playerId: string;
    displayName: string;
    avatarUrl: string | null;
    primaryGameCode: string;
    claimsAttempted: number;
    claimsConfirmed: number;
    claimsDenied: number;
    accuracyRatio: number | null;
    deaths: number;
    survivalRatio: number | null;
    disputeRateRatio: number | null;
    gamesPlayed: number;
  }>;
};

type OrgRow = {
  org: {
    orgId: string;
    name: string | null;
  };
};

type SessionDetailPayload = {
  org?: OrgRow["org"];
  session?: SessionRow;
  message?: string;
};

const SESSION_GROUP_CACHE_TTL_MS = 45_000;

type GroupState =
  | { status: "loading-auth" }
  | { status: "unauthenticated"; message: string }
  | { status: "invalid-session"; message: string }
  | { status: "loading-data" }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; org: OrgRow["org"]; session: SessionRow };

type BusinessSessionGroupPageProps = {
  sessionGroupId: string;
};

function formatDate(value: string | null): string {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function formatStatus(value: SessionRow["status"]): string {
  if (value === "in_progress") return "In Progress";
  if (value === "not_started") return "Pending";
  return "Ended";
}

function statusPillClass(value: SessionRow["status"]): string {
  return `biz-pill biz-pill--status biz-pill--${value}`;
}

function formatTimelineTime(value: string | null): string {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(parsed);
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function healthLabel(value: SessionRow["health"]["status"]): string {
  if (value === "healthy") return "Healthy";
  if (value === "watch") return "Watch";
  if (value === "at_risk") return "At Risk";
  return "Insufficient Data";
}

function orgLabel(name: string | null): string {
  return name?.trim() || "Unassigned Organisation";
}

export default function BusinessSessionGroupPage({ sessionGroupId }: BusinessSessionGroupPageProps) {
  const parsedSessionId = useMemo(() => parseBusinessSessionGroupId(sessionGroupId), [sessionGroupId]);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<GroupState>({ status: "loading-auth" });
  const [sessionNotesDraft, setSessionNotesDraft] = useState("");
  const [notesStatus, setNotesStatus] = useState<"idle" | "saving">("idle");
  const [notesMessage, setNotesMessage] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "downloading">("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!parsedSessionId) {
      setState({ status: "invalid-session", message: "Invalid session identifier." });
      return;
    }

    if (loading) {
      setState({ status: "loading-auth" });
      return;
    }

    if (!user) {
      setState({ status: "unauthenticated", message: "Sign in to access business sessions." });
      return;
    }

    let cancelled = false;
    const load = async () => {
      const cacheKey = `business.session-group.v1.${sessionGroupId}`;
      const cached = readClientCache<SessionDetailPayload>(cacheKey, SESSION_GROUP_CACHE_TTL_MS);
      const hasCachedData = Boolean(cached?.org && cached?.session);
      if (hasCachedData) {
        setState({ status: "ready", org: cached?.org as OrgRow["org"], session: cached?.session as SessionRow });
      } else {
        setState({ status: "loading-data" });
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/business/sessions/groups/${encodeURIComponent(sessionGroupId)}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const payload = (await response.json().catch(() => ({}))) as SessionDetailPayload;
        if (cancelled) return;
        if (!response.ok) {
          if (hasCachedData) return;
          setState({
            status: "error",
            message: typeof payload.message === "string" ? payload.message : "Unable to load session details.",
          });
          return;
        }

        const org = payload.org;
        const session = payload.session;

        if (!org || !session) {
          if (hasCachedData) return;
          setState({ status: "not-found", message: "Session group not found." });
          return;
        }

        writeClientCache(cacheKey, payload);
        setState({
          status: "ready",
          org,
          session,
        });
        setSessionNotesDraft(session.notes.session.text ?? "");
      } catch {
        if (cancelled) return;
        if (hasCachedData) return;
        setState({ status: "error", message: "Unable to load session details." });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loading, parsedSessionId, sessionGroupId, user]);

  useEffect(() => {
    if (state.status !== "unauthenticated") return;
    const next = encodeURIComponent(`/business/sessions/groups/${encodeURIComponent(sessionGroupId)}`);
    router.replace(`/login?next=${next}`);
  }, [router, sessionGroupId, state.status]);

  const saveSessionNotes = async () => {
    if (state.status !== "ready" || !user) return;
    setNotesStatus("saving");
    setNotesMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/business/sessions/groups/${encodeURIComponent(sessionGroupId)}/notes`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: sessionNotesDraft }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setNotesMessage(payload.message ?? "Unable to save session notes.");
        return;
      }

      setState((current) => {
        if (current.status !== "ready") return current;
        return {
          ...current,
          session: {
            ...current.session,
            notes: {
              ...current.session.notes,
              session: {
                ...current.session.notes.session,
                text: sessionNotesDraft,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        };
      });
      setNotesMessage("Session notes saved.");
    } catch {
      setNotesMessage("Unable to save session notes.");
    } finally {
      setNotesStatus("idle");
    }
  };

  const exportSessionCsv = async () => {
    if (!user) return;
    setExportStatus("downloading");
    setExportMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(businessSessionGroupExportApiRoute(sessionGroupId, "csv"), {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        setExportMessage(errorPayload.message ?? "Unable to export session stats.");
        return;
      }

      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `session-group-${sessionGroupId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setExportMessage("Session CSV exported.");
    } catch {
      setExportMessage("Unable to export session stats.");
    } finally {
      setExportStatus("idle");
    }
  };

  return (
    <div className="biz-dark biz-exec mc-rhythm-16 p-3 md:p-4">
      <section className="biz-sessions-shell">
      <header className="biz-sessions-toolbar">
        <h1 className="text-2xl font-bold text-slate-900">
          {state.status === "ready" ? state.session.derivedName : "Session Detail"}
        </h1>
        {state.status === "ready" ? (
          <p className="mt-1 text-sm text-slate-600">
            Organisation: {orgLabel(state.org.name)}
            {" · "}
            <span className={statusPillClass(state.session.status)}>{formatStatus(state.session.status)}</span>
          </p>
        ) : null}
      </header>

      {state.status === "loading-auth" || state.status === "loading-data" ? (
        <div className="biz-sessions-block">
          <BusinessStatePanel tone="loading" title="Loading Session Detail" message="Gathering grouped analytics and timeline..." />
        </div>
      ) : null}

      {state.status === "invalid-session" ? (
        <div className="biz-sessions-block">
          <BusinessStatePanel tone="error" title="Invalid Session ID" message={state.message} />
        </div>
      ) : null}

      {state.status === "not-found" ? (
        <div className="biz-sessions-block">
          <BusinessStatePanel tone="empty" title="Session Not Found" message={state.message} />
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="biz-sessions-block">
          <BusinessStatePanel tone="error" title="Unable To Load Session Detail" message={state.message} />
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <section className="biz-sessions-block">
            <dl className="grid gap-x-6 gap-y-2 md:grid-cols-4">
              <div>
                <dt className="biz-label">Session Name</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{state.session.derivedName}</dd>
              </div>
              <div>
                <dt className="biz-label">Session Type</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">
                  {state.session.sessionType === "real" ? "Real Session" : "Virtual Session"}
                </dd>
              </div>
              <div>
                <dt className="biz-label">Status</dt>
                <dd className="mt-1"><span className={statusPillClass(state.session.status)}>{formatStatus(state.session.status)}</span></dd>
              </div>
              <div>
                <dt className="biz-label">Created</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{formatDate(state.session.createdAt)}</dd>
              </div>
              <div>
                <dt className="biz-label">Players</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{state.session.summary.playerCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="biz-label">Games</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{state.session.gameCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="biz-label">Start</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{formatDate(state.session.summary.startAt)}</dd>
              </div>
              <div>
                <dt className="biz-label">End</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{formatDate(state.session.summary.endAt)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link className="font-medium text-blue-700 hover:text-blue-900" href={businessOrgRoute(state.org.orgId)}>
                Open Organisation
              </Link>
              <Link className="font-medium text-blue-700 hover:text-blue-900" href="/business/sessions">
                All Sessions
              </Link>
              <button
                type="button"
                onClick={() => void exportSessionCsv()}
                disabled={exportStatus === "downloading"}
                className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {exportStatus === "downloading" ? "Exporting..." : "Export Session CSV"}
              </button>
            </div>
            {exportMessage ? <p className="mt-2 text-sm text-slate-600">{exportMessage}</p> : null}
          </section>

          {state.session.migration.isVirtualSession || state.session.migration.identityNeedsReview ? (
            <section className="biz-sessions-block">
              <h2 className="text-lg font-semibold text-slate-900">Migration Indicators</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-3 border-t border-slate-400/25 pt-2.5">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Identity Source</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{state.session.migration.identitySource}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Confidence</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{state.session.migration.identityConfidence}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Review Needed</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">{state.session.migration.identityNeedsReview ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Session Health</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-4 border-t border-slate-400/25 pt-2.5">
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Join Rate</dt><dd className="mt-1 text-base font-semibold text-slate-900">{formatPercent(state.session.health.joinRate)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Completion Rate</dt><dd className="mt-1 text-base font-semibold text-slate-900">{formatPercent(state.session.health.completionRate)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Drop-off Rate</dt><dd className="mt-1 text-base font-semibold text-slate-900">{formatPercent(state.session.health.dropOffRate)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Health Status</dt><dd className="mt-1 text-base font-semibold text-slate-900">{healthLabel(state.session.health.status)}</dd></div>
            </dl>
            {state.session.health.indicators.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {state.session.health.indicators.map((indicator) => (
                  <li key={indicator}>{indicator}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3 border-t border-slate-400/25 pt-2.5">
              {state.session.insights.map((insight) => (
                <article key={insight.id} className="border-l-2 border-slate-400/40 pl-3 py-1.5">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{insight.severity}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{insight.title}</h3>
                  <p className="mt-1 text-sm text-slate-700">{insight.summary}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
            {state.session.alerts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No active anomaly alerts for this session.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {state.session.alerts.map((alert) => (
                  <article
                    key={alert.id}
                    className={alert.level === "critical" ? "border-l-2 border-red-400 pl-3 py-1.5" : "border-l-2 border-amber-400 pl-3 py-1.5"}
                  >
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{alert.message}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Session Games</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="biz-data-table biz-sessions-table min-w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Game Code</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Ended</th>
                    <th className="px-3 py-2">Dashboard</th>
                  </tr>
                </thead>
                <tbody>
                  {state.session.games.map((game) => (
                    <tr key={game.gameCode} className="text-slate-700">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{game.gameCode}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDate(game.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDate(game.startedAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDate(game.endedAt)}</td>
                      <td className="px-3 py-2">
                        <Link className="font-medium text-blue-700 hover:text-blue-900" href={businessSessionRoute(game.gameCode)}>
                          Open Game Dashboard
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Team Analytics</h2>
            {state.session.players.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No cached player analytics available yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="biz-data-table biz-sessions-table min-w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Claims Attempted</th>
                      <th className="px-3 py-2">Confirmed</th>
                      <th className="px-3 py-2">Denied</th>
                      <th className="px-3 py-2">Accuracy</th>
                      <th className="px-3 py-2">Survival</th>
                      <th className="px-3 py-2">Deaths</th>
                      <th className="px-3 py-2">Dispute Rate</th>
                      <th className="px-3 py-2">Drilldown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.session.players.map((player) => (
                      <tr key={player.playerId} className="text-slate-700">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{player.displayName}</td>
                        <td className="px-3 py-2">{player.claimsAttempted.toLocaleString()}</td>
                        <td className="px-3 py-2">{player.claimsConfirmed.toLocaleString()}</td>
                        <td className="px-3 py-2">{player.claimsDenied.toLocaleString()}</td>
                        <td className="px-3 py-2">{formatPercent(player.accuracyRatio)}</td>
                        <td className="px-3 py-2">{formatPercent(player.survivalRatio)}</td>
                        <td className="px-3 py-2">{player.deaths.toLocaleString()}</td>
                        <td className="px-3 py-2">{formatPercent(player.disputeRateRatio)}</td>
                        <td className="px-3 py-2">
                          <Link
                            className="font-medium text-blue-700 hover:text-blue-900"
                            href={businessSessionPlayerRoute(player.primaryGameCode, player.playerId)}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Notes</h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Session Notes</p>
                <textarea
                  className="mt-2 min-h-40 w-full rounded border border-slate-300 p-2 text-sm text-slate-900"
                  value={sessionNotesDraft}
                  onChange={(event) => setSessionNotesDraft(event.target.value)}
                  placeholder="Capture session-level interpretation and follow-up actions..."
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void saveSessionNotes()}
                    disabled={notesStatus === "saving"}
                    className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    {notesStatus === "saving" ? "Saving..." : "Save Notes"}
                  </button>
                  {notesMessage ? <span className="text-sm text-slate-700">{notesMessage}</span> : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Updated: {formatDate(state.session.notes.session.updatedAt)}{" "}
                  {state.session.notes.session.updatedBy ? `by ${state.session.notes.session.updatedBy}` : ""}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Player Notes Preview</p>
                {state.session.notes.players.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No player-level notes available.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {state.session.notes.players.map((row) => (
                      <article key={row.playerId} className="border-l-2 border-slate-400/40 py-1.5 pl-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{row.displayName}</p>
                          <Link className="text-xs text-blue-700 hover:text-blue-900" href={businessSessionPlayerRoute(row.primaryGameCode, row.playerId)}>
                            Open Player
                          </Link>
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm text-slate-700">{row.notes}</p>
                        <p className="mt-1 text-xs text-slate-500">Updated: {formatDate(row.updatedAt)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Timeline Preview</h2>
            {state.session.timelinePreview.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No cached timeline events yet.</p>
            ) : (
              <ol className="mt-3 border-t border-slate-400/25">
                {state.session.timelinePreview.map((event) => (
                  <li key={event.id} className="grid grid-cols-[80px_90px_1fr] gap-3 border-b border-slate-400/25 py-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-500">{formatTimelineTime(event.occurredAt)}</span>
                    <span className="font-mono text-xs uppercase tracking-wide text-slate-500">{event.gameCode}</span>
                    <span>{event.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
      </section>
    </div>
  );
}

