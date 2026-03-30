"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import BusinessStatePanel from "@/components/business/BusinessStatePanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BUSINESS_ROUTES, businessOrgRoute, businessSessionGroupRoute, businessSessionRoute } from "@/lib/business/routes";
import { readClientCache, writeClientCache } from "@/lib/business/client-response-cache";

type SessionRow = {
  sessionId: string;
  sessionType: "real" | "virtual";
  sourceSessionId: string | null;
  title?: string | null;
  derivedName?: string;
  status: "not_started" | "in_progress" | "ended";
  createdAt: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  gameCodes: string[];
  gameCount: number;
};

type OrgGroupRow = {
  org: {
    orgId: string;
    name: string | null;
    ownershipSource: "owner" | "manager";
  };
  summary: {
    sessionCount: number;
    openSessionCount: number;
  };
  sessions: SessionRow[];
};

type SessionsPayload = {
  orgs?: OrgGroupRow[];
  message?: string;
};

const SESSIONS_CACHE_KEY = "business.sessions.index.v1";
const SESSIONS_CACHE_TTL_MS = 45_000;

type PageState =
  | { status: "loading-auth" }
  | { status: "unauthenticated"; message: string }
  | { status: "loading-data" }
  | { status: "error"; message: string }
  | { status: "ready"; orgs: OrgGroupRow[] };

type FlatSessionRow = {
  orgId: string;
  orgName: string | null;
  ownershipSource: "owner" | "manager";
  session: SessionRow;
};

type GameMatchRow = {
  orgId: string;
  orgName: string | null;
  sessionId: string;
  sessionName: string;
  status: SessionRow["status"];
  gameCode: string;
  createdAt: string | null;
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

function sessionLabel(session: SessionRow, fallback: string): string {
  return session.derivedName ?? session.title ?? session.sourceSessionId ?? fallback;
}

function orgLabel(name: string | null): string {
  return name?.trim() || "Unassigned Organisation";
}

function isStalePendingSession(session: SessionRow): boolean {
  if (session.status !== "not_started") return false;
  if (session.startedAt || session.endedAt) return false;
  if (!session.createdAt) return false;
  const createdMs = new Date(session.createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  const STALE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - createdMs >= STALE_WINDOW_MS;
}

function isDashboardVisibleSession(session: SessionRow): boolean {
  return !isStalePendingSession(session);
}

export default function BusinessSessionsIndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<PageState>({ status: "loading-auth" });
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showLoadingHint, setShowLoadingHint] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("biz.sessions.recentSearches");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((value): value is string => typeof value === "string").slice(0, 6));
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearchText(q);
  }, [searchParams]);

  const addRecentSearch = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;

    setRecentSearches((current) => {
      const next = [normalized, ...current.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase())].slice(0, 6);
      try {
        window.localStorage.setItem("biz.sessions.recentSearches", JSON.stringify(next));
      } catch {
        // no-op
      }
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
        const target = event.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        event.preventDefault();
        const input = document.getElementById("session-search") as HTMLInputElement | null;
        input?.focus();
      }
      if (event.key === "Escape") {
        const target = event.target as HTMLElement | null;
        if (target && target.id === "session-search" && searchText.trim()) {
          event.preventDefault();
          setSearchText("");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchText]);

  useEffect(() => {
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
      const cached = readClientCache<SessionsPayload>(SESSIONS_CACHE_KEY, SESSIONS_CACHE_TTL_MS);
      const hasCachedRows = Array.isArray(cached?.orgs);
      if (hasCachedRows) {
        setState({ status: "ready", orgs: (cached?.orgs as OrgGroupRow[]) ?? [] });
      } else {
        setState({ status: "loading-data" });
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/business/sessions", {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => ({}))) as SessionsPayload;
        if (cancelled) return;

        if (!response.ok) {
          if (hasCachedRows) return;
          setState({
            status: "error",
            message: typeof payload.message === "string" ? payload.message : "Unable to load business sessions.",
          });
          return;
        }

        const normalizedPayload: SessionsPayload = { orgs: Array.isArray(payload.orgs) ? payload.orgs : [] };
        writeClientCache(SESSIONS_CACHE_KEY, normalizedPayload);
        setState({ status: "ready", orgs: normalizedPayload.orgs ?? [] });
      } catch {
        if (cancelled) return;
        if (hasCachedRows) return;
        setState({ status: "error", message: "Unable to load business sessions." });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  useEffect(() => {
    if (state.status !== "unauthenticated") return;
    const next = encodeURIComponent("/business/sessions");
    router.replace(`/login?next=${next}`);
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== "loading-auth" && state.status !== "loading-data") {
      setShowLoadingHint(false);
      return;
    }
    const timer = window.setTimeout(() => setShowLoadingHint(true), 350);
    return () => window.clearTimeout(timer);
  }, [state.status]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const normalizedSearchText = searchText.trim();

    if (normalizedSearchText) {
      params.set("q", normalizedSearchText);
    } else {
      params.delete("q");
    }

    params.delete("status");
    params.delete("type");

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next.length > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, searchText]);

  const orgVisibilityStats = useMemo(() => {
    if (state.status !== "ready") {
      return new Map<string, { visibleSessionCount: number; visibleOpenSessionCount: number }>();
    }

    const map = new Map<string, { visibleSessionCount: number; visibleOpenSessionCount: number }>();
    for (const org of state.orgs) {
      const visibleSessions = org.sessions.filter((session) => isDashboardVisibleSession(session));
      map.set(org.org.orgId, {
        visibleSessionCount: visibleSessions.length,
        visibleOpenSessionCount: visibleSessions.filter((session) => session.status !== "ended").length,
      });
    }
    return map;
  }, [state]);

  const totals = useMemo(() => {
    if (state.status !== "ready") {
      return { orgCount: null as number | null, sessionCount: null as number | null, openCount: null as number | null };
    }

    let orgCount = 0;
    let sessionCount = 0;
    let openCount = 0;
    for (const org of state.orgs) {
      orgCount += 1;
      const stats = orgVisibilityStats.get(org.org.orgId);
      sessionCount += stats?.visibleSessionCount ?? org.summary.sessionCount;
      openCount += stats?.visibleOpenSessionCount ?? org.summary.openSessionCount;
    }

    return { orgCount, sessionCount, openCount };
  }, [orgVisibilityStats, state]);

  const flattenedSessions = useMemo<FlatSessionRow[]>(() => {
    if (state.status !== "ready") return [];

    return state.orgs.flatMap((org) =>
      org.sessions.map((session) => ({
        orgId: org.org.orgId,
        orgName: org.org.name,
        ownershipSource: org.org.ownershipSource,
        session,
      }))
    );
  }, [state]);

  const filteredSessions = useMemo(() => flattenedSessions, [flattenedSessions]);

  const recentGames = useMemo<GameMatchRow[]>(() => {
    const entries = filteredSessions
      .filter((entry) => isDashboardVisibleSession(entry.session))
      .flatMap((entry) =>
      entry.session.gameCodes.map((gameCode) => ({
        gameCode,
        createdAt: entry.session.createdAt,
        orgId: entry.orgId,
        orgName: entry.orgName,
        sessionId: entry.session.sessionId,
        sessionName: sessionLabel(entry.session, gameCode),
        status: entry.session.status,
      }))
      );

    return entries
      .sort((left, right) => {
        const leftMs = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightMs = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightMs - leftMs;
      })
      .slice(0, 5);
  }, [filteredSessions]);

  const finderResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query || state.status !== "ready") {
      return {
        orgs: [] as OrgGroupRow[],
        sessions: [] as FlatSessionRow[],
        games: [] as GameMatchRow[],
      };
    }

    const orgs = state.orgs
      .filter((org) => {
        const text = `${org.org.name ?? ""} ${org.org.orgId}`.toLowerCase();
        if (!text.includes(query)) return false;
        return true;
      })
      .slice(0, 20);

    const sessions = filteredSessions
      .filter((entry) => {
        const text = [
          entry.orgName ?? "",
          entry.orgId,
          entry.session.derivedName ?? "",
          entry.session.title ?? "",
          entry.session.sourceSessionId ?? "",
          entry.session.status,
          entry.session.gameCodes.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      })
      .slice(0, 30);

    const games = filteredSessions
      .flatMap((entry) =>
        entry.session.gameCodes.map((gameCode) => ({
          orgId: entry.orgId,
          orgName: entry.orgName,
          sessionId: entry.session.sessionId,
          sessionName: sessionLabel(entry.session, gameCode),
          status: entry.session.status,
          gameCode,
          createdAt: entry.session.createdAt,
        }))
      )
      .filter((entry) => {
        const text = `${entry.gameCode} ${entry.sessionName} ${entry.orgName ?? ""} ${entry.orgId}`.toLowerCase();
        return text.includes(query);
      })
      .slice(0, 30);

    return { orgs, sessions, games };
  }, [filteredSessions, searchText, state]);

  const browseOrgs = useMemo(() => {
    if (state.status !== "ready") return [] as OrgGroupRow[];
    return [...state.orgs]
      .sort((a, b) => {
        const aOpen = orgVisibilityStats.get(a.org.orgId)?.visibleOpenSessionCount ?? a.summary.openSessionCount;
        const bOpen = orgVisibilityStats.get(b.org.orgId)?.visibleOpenSessionCount ?? b.summary.openSessionCount;
        return bOpen - aOpen;
      })
      .slice(0, 14);
  }, [orgVisibilityStats, state]);

  return (
    <div className="biz-dark biz-exec mc-rhythm-16 mx-auto w-full max-w-7xl p-3 md:p-4 text-slate-900">
      <section className="biz-sessions-shell">
        <header className="biz-sessions-toolbar">
          <div>
            <p className="biz-label">Operations Board</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Business Sessions</h1>
            <p className="mt-1 text-sm text-slate-600">Search-first navigation across organisations, session groups, and game dashboards.</p>
          </div>
          <div className="biz-sessions-toolbar-actions">
            <label className="sr-only" htmlFor="session-search">
              Search organisations and sessions
            </label>
            <input
              id="session-search"
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onBlur={() => addRecentSearch(searchText)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addRecentSearch(searchText);
              }}
              placeholder="Search org, session, or game code"
              className="biz-input text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="biz-pill biz-pill--neutral">Orgs {totals.orgCount ?? "--"}</span>
              <span className="biz-pill biz-pill--neutral">Sessions {totals.sessionCount ?? "--"}</span>
              <span className="biz-pill biz-pill--neutral">Open {totals.openCount ?? "--"}</span>
              <Link className="biz-btn biz-btn--primary ml-auto" href={BUSINESS_ROUTES.staff}>
                Open Team Analytics
              </Link>
            </div>
            {recentSearches.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((entry) => (
                  <button key={entry} type="button" onClick={() => setSearchText(entry)} className="biz-btn biz-btn--soft">
                    {entry}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {(state.status === "loading-auth" || state.status === "loading-data") && showLoadingHint ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="loading" title="Loading Sessions" message="Fetching organisations and session groups..." />
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel
              tone="error"
              title="Unable To Load Sessions"
              message={state.message}
              actionLabel="Open Team Analytics"
              actionHref={BUSINESS_ROUTES.staff}
            />
          </div>
        ) : null}

        {state.status === "ready" ? (
          !searchText.trim() ? (
            <div className="biz-sessions-grid">
              <section className="biz-sessions-block">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Recent Games</h2>
                  <span className="text-xs text-slate-500">Last 5</span>
                </div>
                {recentGames.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No recent games found for the selected filter.</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="biz-data-table biz-sessions-table min-w-full">
                      <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr className="border-b border-slate-200">
                          <th>Game</th>
                          <th>Organisation</th>
                          <th>Session</th>
                          <th>Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentGames.map((game) => (
                          <tr key={`${game.sessionId}-${game.gameCode}`} className="border-b border-slate-100 text-slate-700">
                            <td className="font-medium text-slate-900">{game.gameCode}</td>
                            <td>{orgLabel(game.orgName)}</td>
                            <td>{game.sessionName}</td>
                            <td>
                              <span className={statusPillClass(game.status)}>{formatStatus(game.status)}</span>
                            </td>
                            <td className="text-right">
                              <div className="inline-flex items-center gap-3">
                                <Link className="text-blue-700 hover:text-blue-900" href={businessSessionGroupRoute(game.sessionId)}>
                                  Session
                                </Link>
                                <Link className="text-slate-700 underline underline-offset-2 hover:text-slate-900" href={businessSessionRoute(game.gameCode)}>
                                  Game
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="biz-sessions-block">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">Organisations</h2>
                  <span className="text-xs text-slate-500">Top by open sessions</span>
                </div>
                {browseOrgs.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No organisation sessions are available yet.</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="biz-data-table biz-sessions-table min-w-full">
                      <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr className="border-b border-slate-200">
                          <th>Organisation</th>
                          <th>Open</th>
                          <th>Total</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {browseOrgs.map((org) => (
                          <tr key={org.org.orgId} className="border-b border-slate-100 text-slate-700">
                            <td>
                              <p className="font-medium text-slate-900">{orgLabel(org.org.name)}</p>
                              <p className="text-xs text-slate-500">{org.org.ownershipSource}</p>
                            </td>
                            <td>{(orgVisibilityStats.get(org.org.orgId)?.visibleOpenSessionCount ?? org.summary.openSessionCount).toLocaleString()}</td>
                            <td>{(orgVisibilityStats.get(org.org.orgId)?.visibleSessionCount ?? org.summary.sessionCount).toLocaleString()}</td>
                            <td className="text-right">
                              <Link className="text-blue-700 hover:text-blue-900" href={businessOrgRoute(org.org.orgId)}>
                                Open Organisation
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <>
              <section className="biz-sessions-block">
                <p className="text-xs text-slate-600">
                  Results for <span className="font-semibold text-slate-900">&quot;{searchText.trim()}&quot;</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="biz-pill biz-pill--neutral">Orgs {finderResults.orgs.length}</span>
                  <span className="biz-pill biz-pill--neutral">Sessions {finderResults.sessions.length}</span>
                  <span className="biz-pill biz-pill--neutral">Games {finderResults.games.length}</span>
                </div>
              </section>

              <section className="biz-sessions-block">
                <h2 className="text-sm font-semibold text-slate-900">Organisation Matches</h2>
                {finderResults.orgs.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">No organisations match this search.</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="biz-data-table biz-sessions-table min-w-full">
                      <tbody>
                        {finderResults.orgs.map((org) => (
                          <tr key={org.org.orgId} className="border-b border-slate-100 text-slate-700">
                            <td>
                              <p className="font-medium text-slate-900">{orgLabel(org.org.name)}</p>
                              <p className="text-xs text-slate-500">{org.summary.sessionCount} sessions</p>
                            </td>
                            <td className="text-right">
                              <Link className="text-blue-700 hover:text-blue-900" href={businessOrgRoute(org.org.orgId)}>
                                Open Organisation
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="biz-sessions-grid">
                <section className="biz-sessions-block">
                  <h2 className="text-sm font-semibold text-slate-900">Session Matches</h2>
                  {finderResults.sessions.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No sessions match this search.</p>
                  ) : (
                    <div className="mt-2 max-h-[58vh] overflow-auto">
                      <table className="biz-data-table biz-sessions-table min-w-full">
                        <tbody>
                          {finderResults.sessions.map((entry) => (
                            <tr key={`${entry.orgId}-${entry.session.sessionId}`} className="border-b border-slate-100 text-slate-700">
                              <td>
                                <p className="font-medium text-slate-900">{sessionLabel(entry.session, "Session")}</p>
                                <p className="text-xs text-slate-500">
                                  {orgLabel(entry.orgName)} · {formatDate(entry.session.createdAt)}
                                </p>
                              </td>
                              <td>
                                <span className={statusPillClass(entry.session.status)}>{formatStatus(entry.session.status)}</span>
                              </td>
                              <td className="text-right">
                                <Link className="text-blue-700 hover:text-blue-900" href={businessSessionGroupRoute(entry.session.sessionId)}>
                                  Open Session
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
                  <h2 className="text-sm font-semibold text-slate-900">Game Code Matches</h2>
                  {finderResults.games.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">No games match this search.</p>
                  ) : (
                    <div className="mt-2 max-h-[58vh] overflow-auto">
                      <table className="biz-data-table biz-sessions-table min-w-full">
                        <tbody>
                          {finderResults.games.map((entry) => (
                            <tr key={`${entry.sessionId}-${entry.gameCode}`} className="border-b border-slate-100 text-slate-700">
                              <td>
                                <p className="font-medium text-slate-900">{entry.gameCode}</p>
                                <p className="text-xs text-slate-500">{orgLabel(entry.orgName)} · {entry.sessionName}</p>
                              </td>
                              <td>
                                <span className={statusPillClass(entry.status)}>{formatStatus(entry.status)}</span>
                              </td>
                              <td className="text-right">
                                <div className="inline-flex items-center gap-3">
                                  <Link className="text-blue-700 hover:text-blue-900" href={businessSessionGroupRoute(entry.sessionId)}>
                                    Session
                                  </Link>
                                  <Link className="text-slate-700 underline underline-offset-2 hover:text-slate-900" href={businessSessionRoute(entry.gameCode)}>
                                    Game
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </>
          )
        ) : null}
      </section>
    </div>
  );
}

