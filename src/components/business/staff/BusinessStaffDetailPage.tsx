"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessStatePanel from "@/components/business/BusinessStatePanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { businessSessionRoute, businessTeamMemberSettingsRoute } from "@/lib/business/routes";

type Summary = {
  displayName: string;
  avatarUrl?: string | null;
  sessionsPlayed: number;
  latestAccuracyRatio: number | null;
  trendIndicator: "up" | "down" | "flat" | "unknown";
  identityConfidence: "high" | "medium" | "low";
  identityNeedsReview: boolean;
  identitySource: string;
};

type Point = {
  index: number;
  gameCode: string;
  value: number | null;
};

type HistoryRow = {
  gameCode: string;
  orgName: string | null;
  sessionName: string;
  sessionStatus: string;
  observedAt: string | null;
  claimsSubmitted: number;
  claimsConfirmed: number;
  claimsDenied: number;
  accuracyRatio: number | null;
  disputeRateRatio: number | null;
  deaths: number;
};

type DetailPayload = {
  summary?: Summary;
  series?: {
    accuracy?: Point[];
    claimsConfirmed?: Point[];
    disputeRate?: Point[];
  };
  cohort?: {
    orgId: string;
    orgName: string | null;
    sampleMembers: number;
    range?: string;
    medianAccuracyRatio: number | null;
    medianDisputeRateRatio: number | null;
    medianClaimsConfirmedPerSession: number | null;
    medianClaimsSubmittedPerSession: number | null;
    medianClaimsDeniedPerSession: number | null;
    medianKdRatio: number | null;
  };
  sessionHistory?: HistoryRow[];
  message?: string;
};

type BusinessStaffDetailPageProps = {
  staffKey: string;
};

type TimeRange = "30d" | "90d" | "180d" | "all";

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function formatRatio(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toFixed(2);
}

function trendLabel(value: Summary["trendIndicator"]): string {
  if (value === "up") return "Improving";
  if (value === "down") return "Declining";
  if (value === "flat") return "Steady";
  return "Insufficient Data";
}

function trendPillClass(value: Summary["trendIndicator"]): string {
  if (value === "up") return "biz-pill biz-pill--ended";
  if (value === "down") return "biz-pill biz-pill--in_progress";
  if (value === "flat") return "biz-pill biz-pill--neutral";
  return "biz-pill biz-pill--insufficient";
}

function Sparkline({ points, percent }: { points: Point[]; percent: boolean }) {
  const normalized = useMemo(() => points.map((point) => point.value).filter((value): value is number => value != null && Number.isFinite(value)), [points]);
  if (normalized.length < 2) {
    return <p className="text-sm text-slate-600">Not enough data points.</p>;
  }

  const min = Math.min(...normalized);
  const max = Math.max(...normalized);
  const range = max - min || 1;
  const width = 280;
  const height = 80;
  const coordinates = points
    .map((point, idx) => {
      if (point.value == null || !Number.isFinite(point.value)) return null;
      const x = (idx / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${x},${y}`;
    })
    .filter((entry): entry is string => entry != null)
    .join(" ");

  return (
    <div className="space-y-2">
      <svg className="h-20 w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline fill="none" stroke="rgb(37 99 235)" strokeWidth="2.5" points={coordinates} />
      </svg>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{percent ? `${Math.round(min * 100)}%` : Math.round(min).toLocaleString()}</span>
        <span>{percent ? `${Math.round(max * 100)}%` : Math.round(max).toLocaleString()}</span>
      </div>
    </div>
  );
}

function toMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDeltaPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 100)}pp`;
}

function formatDeltaCount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value).toLocaleString()}`;
}

function formatDeltaRatio(current: number | null, baseline: number | null): string {
  if (current == null || baseline == null || !Number.isFinite(current) || !Number.isFinite(baseline)) return "--";
  const delta = current - baseline;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Math.round(delta * 100)}pp`;
}

function deltaToneClass(value: number | null, invert = false): string {
  if (value == null || !Number.isFinite(value)) return "text-slate-500";
  if (value === 0) return "text-slate-500";
  const positive = value > 0;
  const good = invert ? !positive : positive;
  return good ? "text-emerald-400" : "text-amber-300";
}

export default function BusinessStaffDetailPage({ staffKey }: BusinessStaffDetailPageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading-auth" | "loading-data" | "ready" | "error" | "unauthenticated">("loading-auth");
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<DetailPayload>({});
  const [range, setRange] = useState<TimeRange>("90d");

  useEffect(() => {
    if (loading) {
      setStatus("loading-auth");
      return;
    }
    if (!user) {
      setStatus("unauthenticated");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setStatus("loading-data");
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/business/staff/${encodeURIComponent(staffKey)}?range=${encodeURIComponent(range)}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const body = (await response.json().catch(() => ({}))) as DetailPayload;
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(body.message ?? "Unable to load team member detail.");
          return;
        }
        setPayload(body);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Unable to load team member detail.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [loading, range, staffKey, user]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(`/login?next=${encodeURIComponent(`/business/teams/${staffKey}`)}`);
  }, [router, staffKey, status]);

  const summary = payload.summary;
  const series = payload.series ?? {};
  const cohort = payload.cohort;
  const history = payload.sessionHistory ?? [];
  const nowMs = Date.now();

  const rangeWindowMs = useMemo(() => {
    if (range === "30d") return 30 * 24 * 60 * 60 * 1000;
    if (range === "90d") return 90 * 24 * 60 * 60 * 1000;
    if (range === "180d") return 180 * 24 * 60 * 60 * 1000;
    return null;
  }, [range]);

  const filteredHistory = useMemo(() => {
    if (!rangeWindowMs) return history;
    const startMs = nowMs - rangeWindowMs;
    return history.filter((row) => {
      const observedMs = toMs(row.observedAt);
      if (observedMs == null) return false;
      return observedMs >= startMs;
    });
  }, [history, nowMs, rangeWindowMs]);

  const filteredGameCodes = useMemo(() => new Set(filteredHistory.map((row) => row.gameCode)), [filteredHistory]);
  const filteredAccuracyPoints = useMemo(
    () => (range === "all" ? series.accuracy ?? [] : (series.accuracy ?? []).filter((point) => filteredGameCodes.has(point.gameCode))),
    [filteredGameCodes, range, series.accuracy]
  );
  const filteredClaimsPoints = useMemo(
    () => (range === "all" ? series.claimsConfirmed ?? [] : (series.claimsConfirmed ?? []).filter((point) => filteredGameCodes.has(point.gameCode))),
    [filteredGameCodes, range, series.claimsConfirmed]
  );
  const filteredDisputePoints = useMemo(
    () => (range === "all" ? series.disputeRate ?? [] : (series.disputeRate ?? []).filter((point) => filteredGameCodes.has(point.gameCode))),
    [filteredGameCodes, range, series.disputeRate]
  );

  const rangeStats = useMemo(() => {
    const accuracyRows = filteredHistory.map((row) => row.accuracyRatio).filter((value): value is number => value != null && Number.isFinite(value));
    const disputeRows = filteredHistory.map((row) => row.disputeRateRatio).filter((value): value is number => value != null && Number.isFinite(value));
    const claimsConfirmedTotal = filteredHistory.reduce((sum, row) => sum + Math.max(0, row.claimsConfirmed), 0);
    const average = (values: number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    return {
      sampleSessions: filteredHistory.length,
      averageAccuracy: average(accuracyRows),
      averageDisputeRate: average(disputeRows),
      claimsConfirmedTotal,
      claimsConfirmedPerSession: filteredHistory.length > 0 ? claimsConfirmedTotal / filteredHistory.length : null,
      claimsSubmittedPerSession:
        filteredHistory.length > 0
          ? filteredHistory.reduce((sum, row) => sum + Math.max(0, row.claimsSubmitted), 0) / filteredHistory.length
          : null,
      claimsDeniedPerSession:
        filteredHistory.length > 0
          ? filteredHistory.reduce((sum, row) => sum + Math.max(0, row.claimsDenied), 0) / filteredHistory.length
          : null,
      kdRatio:
        filteredHistory.length > 0
          ? (() => {
              const confirmed = filteredHistory.reduce((sum, row) => sum + Math.max(0, row.claimsConfirmed), 0);
              const deaths = filteredHistory.reduce((sum, row) => sum + Math.max(0, row.deaths), 0);
              return deaths > 0 ? confirmed / deaths : confirmed;
            })()
          : null,
    };
  }, [filteredHistory]);

  const hasEnoughTrendData = useMemo(
    () =>
      filteredAccuracyPoints.filter((point) => point.value != null).length >= 2 ||
      filteredClaimsPoints.filter((point) => point.value != null).length >= 2 ||
      filteredDisputePoints.filter((point) => point.value != null).length >= 2,
    [filteredAccuracyPoints, filteredClaimsPoints, filteredDisputePoints]
  );

  const periodDeltas = useMemo(() => {
    if (!rangeWindowMs) {
      return { accuracyDelta: null as number | null, disputeDelta: null as number | null, claimsDelta: null as number | null };
    }
    const currentStartMs = nowMs - rangeWindowMs;
    const previousStartMs = currentStartMs - rangeWindowMs;
    const currentRows = history.filter((row) => {
      const ms = toMs(row.observedAt);
      return ms != null && ms >= currentStartMs;
    });
    const previousRows = history.filter((row) => {
      const ms = toMs(row.observedAt);
      return ms != null && ms >= previousStartMs && ms < currentStartMs;
    });
    const avg = (rows: HistoryRow[], picker: (row: HistoryRow) => number | null): number | null => {
      const values = rows.map(picker).filter((value): value is number => value != null && Number.isFinite(value));
      if (values.length === 0) return null;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };
    const sum = (rows: HistoryRow[], picker: (row: HistoryRow) => number): number => rows.reduce((acc, row) => acc + picker(row), 0);
    const currentAccuracy = avg(currentRows, (row) => row.accuracyRatio);
    const previousAccuracy = avg(previousRows, (row) => row.accuracyRatio);
    const currentDispute = avg(currentRows, (row) => row.disputeRateRatio);
    const previousDispute = avg(previousRows, (row) => row.disputeRateRatio);
    const currentClaims = sum(currentRows, (row) => row.claimsConfirmed);
    const previousClaims = sum(previousRows, (row) => row.claimsConfirmed);
    return {
      accuracyDelta: currentAccuracy != null && previousAccuracy != null ? currentAccuracy - previousAccuracy : null,
      disputeDelta: currentDispute != null && previousDispute != null ? currentDispute - previousDispute : null,
      claimsDelta: previousRows.length > 0 ? currentClaims - previousClaims : null,
    };
  }, [history, nowMs, rangeWindowMs]);

  return (
    <div className="biz-dark biz-exec mc-rhythm-16 p-3 md:p-4 text-slate-900">
      <section className="biz-sessions-shell">
        <header className="biz-sessions-toolbar">
          <div className="flex items-start gap-3">
            {summary?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={summary.avatarUrl}
                alt={`${summary.displayName} avatar`}
                className="h-12 w-12 rounded-full border border-slate-400/30 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-400/30 bg-slate-700/40 text-sm font-semibold text-slate-200">
                {(summary?.displayName ?? "TM").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="biz-label">Longitudinal Team Analytics</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">{summary?.displayName ?? "Team Member Detail"}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <Link
                  className="inline-flex items-center rounded-lg border border-slate-300/45 bg-slate-800/70 px-3 py-1.5 text-sm font-semibold tracking-[0.01em] !text-slate-100 no-underline transition hover:border-sky-300/60 hover:bg-slate-700/80 hover:!text-white"
                  href="/business/teams"
                >
                  Back to Team
                </Link>
                <Link
                  className="inline-flex items-center rounded-lg border border-slate-300/45 bg-slate-800/55 px-3 py-1.5 text-sm font-semibold tracking-[0.01em] !text-slate-100 no-underline transition hover:border-sky-300/60 hover:bg-slate-700/75 hover:!text-white"
                  href={businessTeamMemberSettingsRoute(staffKey)}
                >
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </header>

        {status === "loading-auth" || status === "loading-data" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="loading" title="Loading Team Detail" message="Building historical profile..." />
          </div>
        ) : null}

        {status === "error" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="error" title="Unable To Load Team Detail" message={message ?? "Unable to load team member detail."} />
          </div>
        ) : null}

        {status === "ready" && summary ? (
          <>
            <section className="biz-sessions-block">
              <div className="mb-3 rounded-md border border-amber-300/40 bg-amber-900/20 px-3 py-2 text-sm text-amber-100">
                {rangeStats.sampleSessions < 2
                  ? "Low confidence insights: baseline only. Trend analysis requires at least 2 sessions in the selected window."
                  : rangeStats.sampleSessions < 4
                    ? "Moderate confidence insights: limited sample size in selected window."
                    : "High confidence window: enough sessions for directional trend analysis."}
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="biz-label">Analysis Window</span>
                    {(["30d", "90d", "180d", "all"] as TimeRange[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={range === option ? "biz-btn biz-btn--primary" : "biz-btn biz-btn--soft"}
                        onClick={() => setRange(option)}
                      >
                        {option === "all" ? "All Time" : option}
                      </button>
                    ))}
                    <span className="ml-auto text-xs text-slate-500">
                      Sample: {rangeStats.sampleSessions.toLocaleString()} session{rangeStats.sampleSessions === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div>
                    <p className="biz-label">Current Window</p>
                    <dl className="mt-2 grid gap-3 sm:grid-cols-3">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Sessions</dt>
                        <dd className="mt-1 text-xl font-semibold text-slate-900">{summary.sessionsPlayed.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Accuracy</dt>
                        <dd className="mt-1 text-xl font-semibold text-slate-900">{formatPercent(rangeStats.averageAccuracy ?? summary.latestAccuracyRatio)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Claims / Session</dt>
                        <dd className="mt-1 text-xl font-semibold text-slate-900">
                          {rangeStats.claimsConfirmedPerSession != null ? Math.round(rangeStats.claimsConfirmedPerSession).toLocaleString() : "--"}
                        </dd>
                      </div>
                    </dl>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-slate-400/25 pt-2.5 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Trend</dt>
                        <dd className="mt-1"><span className={trendPillClass(summary.trendIndicator)}>{trendLabel(summary.trendIndicator)}</span></dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Window</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{range === "all" ? "All Time" : range}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Accuracy Delta</dt>
                        <dd className={`mt-1 text-sm font-semibold ${deltaToneClass(periodDeltas.accuracyDelta)}`}>{formatDeltaPercent(periodDeltas.accuracyDelta)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Claims Delta</dt>
                        <dd className={`mt-1 text-sm font-semibold ${deltaToneClass(periodDeltas.claimsDelta)}`}>{formatDeltaCount(periodDeltas.claimsDelta)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Dispute (Window)</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-900">{formatPercent(rangeStats.averageDisputeRate)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                {cohort ? (
                  <div className="border-t border-slate-400/25 pt-2.5 xl:border-t-0 xl:border-l xl:border-slate-400/25 xl:pl-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold text-slate-900">Vs Org Median</h2>
                      <p className="text-xs text-slate-500">
                        {cohort.orgName ?? "Organisation"} - {cohort.sampleMembers.toLocaleString()} members
                      </p>
                    </div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="py-1 pr-3">Metric</th>
                            <th className="py-1 pr-3">You</th>
                            <th className="py-1 pr-3">Median</th>
                            <th className="py-1">Delta</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-900">
                          <tr className="border-t border-slate-400/25">
                            <td className="py-2 pr-3 font-medium">Accuracy</td>
                            <td className="py-2 pr-3">{formatPercent(rangeStats.averageAccuracy)}</td>
                            <td className="py-2 pr-3">{formatPercent(cohort.medianAccuracyRatio)}</td>
                            <td className={`py-2 ${deltaToneClass(
                              rangeStats.averageAccuracy != null && cohort.medianAccuracyRatio != null
                                ? rangeStats.averageAccuracy - cohort.medianAccuracyRatio
                                : null
                            )}`}>{formatDeltaRatio(rangeStats.averageAccuracy, cohort.medianAccuracyRatio)}</td>
                          </tr>
                          <tr className="border-t border-slate-400/25">
                            <td className="py-2 pr-3 font-medium">K/D</td>
                            <td className="py-2 pr-3">{formatRatio(rangeStats.kdRatio)}</td>
                            <td className="py-2 pr-3">{formatRatio(cohort.medianKdRatio)}</td>
                            <td className={`py-2 ${deltaToneClass(
                              rangeStats.kdRatio != null && cohort.medianKdRatio != null ? rangeStats.kdRatio - cohort.medianKdRatio : null
                            )}`}>
                              {rangeStats.kdRatio != null && cohort.medianKdRatio != null
                                ? `${rangeStats.kdRatio - cohort.medianKdRatio > 0 ? "+" : ""}${(rangeStats.kdRatio - cohort.medianKdRatio).toFixed(2)}`
                                : "--"}
                            </td>
                          </tr>
                          <tr className="border-t border-slate-400/25">
                            <td className="py-2 pr-3 font-medium">Claims Submitted / Session</td>
                            <td className="py-2 pr-3">
                              {rangeStats.claimsSubmittedPerSession != null ? Math.round(rangeStats.claimsSubmittedPerSession).toLocaleString() : "--"}
                            </td>
                            <td className="py-2 pr-3">
                              {cohort.medianClaimsSubmittedPerSession != null ? Math.round(cohort.medianClaimsSubmittedPerSession).toLocaleString() : "--"}
                            </td>
                            <td className={`py-2 ${deltaToneClass(
                              rangeStats.claimsSubmittedPerSession != null && cohort.medianClaimsSubmittedPerSession != null
                                ? rangeStats.claimsSubmittedPerSession - cohort.medianClaimsSubmittedPerSession
                                : null
                            )}`}>
                              {formatDeltaCount(
                                rangeStats.claimsSubmittedPerSession != null && cohort.medianClaimsSubmittedPerSession != null
                                  ? rangeStats.claimsSubmittedPerSession - cohort.medianClaimsSubmittedPerSession
                                  : null
                              )}
                            </td>
                          </tr>
                          <tr className="border-t border-slate-400/25">
                            <td className="py-2 pr-3 font-medium">Dispute Rate</td>
                            <td className="py-2 pr-3">{formatPercent(rangeStats.averageDisputeRate)}</td>
                            <td className="py-2 pr-3">{formatPercent(cohort.medianDisputeRateRatio)}</td>
                            <td className={`py-2 ${deltaToneClass(
                              rangeStats.averageDisputeRate != null && cohort.medianDisputeRateRatio != null
                                ? rangeStats.averageDisputeRate - cohort.medianDisputeRateRatio
                                : null,
                              true
                            )}`}>{formatDeltaRatio(rangeStats.averageDisputeRate, cohort.medianDisputeRateRatio)}</td>
                          </tr>
                          <tr className="border-t border-slate-400/25">
                            <td className="py-2 pr-3 font-medium">Claims / Session</td>
                            <td className="py-2 pr-3">
                              {rangeStats.claimsConfirmedPerSession != null ? Math.round(rangeStats.claimsConfirmedPerSession).toLocaleString() : "--"}
                            </td>
                            <td className="py-2 pr-3">
                              {cohort.medianClaimsConfirmedPerSession != null ? Math.round(cohort.medianClaimsConfirmedPerSession).toLocaleString() : "--"}
                            </td>
                            <td className={`py-2 ${deltaToneClass(
                              rangeStats.claimsConfirmedPerSession != null && cohort.medianClaimsConfirmedPerSession != null
                                ? rangeStats.claimsConfirmedPerSession - cohort.medianClaimsConfirmedPerSession
                                : null
                            )}`}>
                              {formatDeltaCount(
                                rangeStats.claimsConfirmedPerSession != null && cohort.medianClaimsConfirmedPerSession != null
                                  ? rangeStats.claimsConfirmedPerSession - cohort.medianClaimsConfirmedPerSession
                                  : null
                              )}
                            </td>
                          </tr>
                          <tr className="border-t border-slate-400/25">
                            <td className="py-2 pr-3 font-medium">Claims Denied / Session</td>
                            <td className="py-2 pr-3">
                              {rangeStats.claimsDeniedPerSession != null ? Math.round(rangeStats.claimsDeniedPerSession).toLocaleString() : "--"}
                            </td>
                            <td className="py-2 pr-3">
                              {cohort.medianClaimsDeniedPerSession != null ? Math.round(cohort.medianClaimsDeniedPerSession).toLocaleString() : "--"}
                            </td>
                            <td className={`py-2 ${deltaToneClass(
                              rangeStats.claimsDeniedPerSession != null && cohort.medianClaimsDeniedPerSession != null
                                ? rangeStats.claimsDeniedPerSession - cohort.medianClaimsDeniedPerSession
                                : null,
                              true
                            )}`}>
                              {formatDeltaCount(
                                rangeStats.claimsDeniedPerSession != null && cohort.medianClaimsDeniedPerSession != null
                                  ? rangeStats.claimsDeniedPerSession - cohort.medianClaimsDeniedPerSession
                                  : null
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="biz-sessions-block">
              <h2 className="text-lg font-semibold text-slate-900">Performance Trends</h2>
              {!hasEnoughTrendData ? (
                <p className="mt-2 text-sm text-slate-500">Need at least 2 sessions in this window to render trend lines.</p>
              ) : (
                <div className="mt-3 grid gap-4 lg:grid-cols-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Accuracy</p>
                    <div className="mt-2">
                      <Sparkline points={filteredAccuracyPoints} percent />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Claims Confirmed</p>
                    <div className="mt-2">
                      <Sparkline points={filteredClaimsPoints} percent={false} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Dispute Rate</p>
                    <p className={`mt-1 text-xs ${deltaToneClass(periodDeltas.disputeDelta, true)}`}>Delta: {formatDeltaPercent(periodDeltas.disputeDelta)}</p>
                    <div className="mt-1">
                      <Sparkline points={filteredDisputePoints} percent />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="biz-sessions-block">
              <h2 className="text-lg font-semibold text-slate-900">Session History</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="biz-data-table biz-sessions-table min-w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Session</th>
                      <th className="px-3 py-2">Game</th>
                      <th className="px-3 py-2">Observed</th>
                      <th className="px-3 py-2">Accuracy</th>
                      <th className="px-3 py-2">Submitted</th>
                      <th className="px-3 py-2">Confirmed</th>
                      <th className="px-3 py-2">Denied</th>
                      <th className="px-3 py-2">K/D</th>
                      <th className="px-3 py-2">Dispute</th>
                      <th className="px-3 py-2">Deaths</th>
                      <th className="px-3 py-2">Session Dashboard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row) => (
                      <tr key={`${row.gameCode}-${row.observedAt ?? "na"}`} className="text-slate-700">
                        <td className="px-3 py-2">{row.sessionName}</td>
                        <td className="px-3 py-2">{row.gameCode}</td>
                        <td className="px-3 py-2">{row.observedAt ? new Date(row.observedAt).toLocaleString() : "--"}</td>
                        <td className="px-3 py-2">{formatPercent(row.accuracyRatio)}</td>
                        <td className="px-3 py-2">{row.claimsSubmitted.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.claimsConfirmed.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.claimsDenied.toLocaleString()}</td>
                        <td className="px-3 py-2">{formatRatio(row.deaths > 0 ? row.claimsConfirmed / row.deaths : row.claimsConfirmed)}</td>
                        <td className="px-3 py-2">{formatPercent(row.disputeRateRatio)}</td>
                        <td className="px-3 py-2">{row.deaths.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <Link className="font-medium text-blue-700 hover:text-blue-900" href={businessSessionRoute(row.gameCode)}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredHistory.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No session history in the selected window.</p>
              ) : null}
            </section>
          </>
        ) : null}
      </section>
    </div>
  );
}
