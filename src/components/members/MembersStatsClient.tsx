"use client";

import { useEffect, useMemo, useState } from "react";

import AchievementsPanel from "@/components/members/AchievementsPanel";
import { sanitizeAchievementBadgeAssetKeys } from "@/lib/achievements/badge-assets";
import StatsPanel from "@/components/members/StatsPanel";
import type { MemberStatsSummary } from "@/lib/auth/member-stats";
import { useAuth } from "@/lib/auth/AuthProvider";

type Timeframe = "7d" | "30d" | "90d" | "all";
type ModeFilter = "all" | "classic" | "ring" | "guild" | "team";
type MetricKey = "games" | "winRate" | "kd" | "points";

type TrendPoint = {
  gameCode: string;
  mode: string | null;
  occurredAt: string | null;
  kills: number;
  deaths: number;
  won: boolean;
  points: number;
  mvpAwards: number;
};

type TrendsResponse = {
  timeframe: Timeframe;
  mode: string;
  totals: MemberStatsSummary;
  trend: TrendPoint[];
};

type AchievementProgress = {
  kdQualifiedSessions: number;
  accuracyPercent: number;
  cleanClaims: number;
  lowDisputeSessions: number;
  topPerformerSessions: number;
  comebackWins: number;
  ironWallSessions: number;
  activeDays30d: number;
  consistencyQualifiedGames: number;
};

const TIMEFRAME_OPTIONS: Array<{ value: Timeframe; label: string }> = [
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All time" },
];

const MODE_OPTIONS: Array<{ value: ModeFilter; label: string }> = [
  { value: "all", label: "All modes" },
  { value: "classic", label: "Classic" },
  { value: "ring", label: "Ring" },
  { value: "guild", label: "Guild" },
  { value: "team", label: "Team" },
];

function readPathValue(source: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function readNumberFromPaths(source: Record<string, unknown>, paths: string[]): number {
  for (const path of paths) {
    const value = path.includes(".") ? readPathValue(source, path) : source[path];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function resolveAchievementProgress(stats: MemberStatsSummary, profile: unknown): AchievementProgress {
  const profileObject = profile && typeof profile === "object" ? (profile as Record<string, unknown>) : {};
  const rawAccuracy = readNumberFromPaths(profileObject, [
    "accuracyRatio",
    "accuracy",
    "stats.accuracyRatio",
    "stats.accuracy",
    "achievements.progress.accuracyRatio",
    "achievements.progress.accuracyPercent",
    "achievementProgress.accuracyRatio",
    "achievementProgress.accuracyPercent",
  ]);
  const accuracyPercent = rawAccuracy <= 1 && rawAccuracy > 0 ? rawAccuracy * 100 : rawAccuracy;
  const winRate = stats.gamesPlayed > 0 ? stats.wins / stats.gamesPlayed : 0;

  return {
    kdQualifiedSessions: readNumberFromPaths(profileObject, [
      "kdQualifiedSessions",
      "stats.kdQualifiedSessions",
      "achievements.progress.kdQualifiedSessions",
      "achievementProgress.kdQualifiedSessions",
    ]),
    accuracyPercent,
    cleanClaims: readNumberFromPaths(profileObject, [
      "cleanClaims",
      "stats.cleanClaims",
      "achievements.progress.cleanClaims",
      "achievementProgress.cleanClaims",
    ]),
    lowDisputeSessions: readNumberFromPaths(profileObject, [
      "lowDisputeSessions",
      "stats.lowDisputeSessions",
      "achievements.progress.lowDisputeSessions",
      "achievementProgress.lowDisputeSessions",
    ]),
    topPerformerSessions: readNumberFromPaths(profileObject, [
      "topPerformerSessions",
      "stats.topPerformerSessions",
      "achievements.progress.topPerformerSessions",
      "achievementProgress.topPerformerSessions",
    ]),
    comebackWins: readNumberFromPaths(profileObject, [
      "comebackWins",
      "stats.comebackWins",
      "achievements.progress.comebackWins",
      "achievementProgress.comebackWins",
    ]),
    ironWallSessions: readNumberFromPaths(profileObject, [
      "ironWallSessions",
      "stats.ironWallSessions",
      "achievements.progress.ironWallSessions",
      "achievementProgress.ironWallSessions",
    ]),
    activeDays30d: readNumberFromPaths(profileObject, [
      "activeDays30d",
      "stats.activeDays30d",
      "achievements.progress.activeDays30d",
      "achievementProgress.activeDays30d",
    ]),
    consistencyQualifiedGames:
      readNumberFromPaths(profileObject, [
        "consistencyQualifiedGames",
        "stats.consistencyQualifiedGames",
        "achievements.progress.consistencyQualifiedGames",
        "achievementProgress.consistencyQualifiedGames",
      ]) || (winRate >= 0.55 ? stats.gamesPlayed : 0),
  };
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

function ratioToPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(1)}%`;
}

function formatKpi(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return digits === 0 ? value.toLocaleString() : value.toFixed(digits);
}

function buildMetricSeries(metric: MetricKey, trend: TrendPoint[]): number[] {
  const capped = trend.slice(-30);
  if (capped.length === 0) return [];

  if (metric === "games") {
    return capped.map((_, index) => index + 1);
  }

  if (metric === "winRate") {
    let wins = 0;
    return capped.map((point, index) => {
      if (point.won) wins += 1;
      return wins / (index + 1);
    });
  }

  if (metric === "kd") {
    let kills = 0;
    let deaths = 0;
    return capped.map((point) => {
      kills += point.kills;
      deaths += point.deaths;
      return deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
    });
  }

  let cumulativePoints = 0;
  return capped.map((point) => {
    cumulativePoints += point.points;
    return cumulativePoints;
  });
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(1, max - min);
  const width = 120;
  const height = 30;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * (height - 2) - 1;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="mt-2">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-[#D96A5A]" />
    </svg>
  );
}

function formatMetricValue(metric: MetricKey, value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  if (metric === "games" || metric === "points") return value.toLocaleString();
  if (metric === "winRate") return ratioToPercent(value);
  return value.toFixed(2);
}

function buildOverlayPath(args: {
  series: number[];
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}): string {
  const { series, width, height, padding } = args;
  if (series.length < 2) return "";
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = Math.max(max - min, 1e-6);
  return series
    .map((value, index) => {
      const x = padding.left + (index / (series.length - 1)) * innerWidth;
      const y = padding.top + (1 - (value - min) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function summarizePeriod(metric: MetricKey, points: TrendPoint[]): number | null {
  if (points.length === 0) return null;
  if (metric === "games") return points.length;
  if (metric === "points") return points.reduce((sum, point) => sum + point.points, 0);
  if (metric === "winRate") {
    const wins = points.filter((point) => point.won).length;
    return wins / points.length;
  }
  const kills = points.reduce((sum, point) => sum + point.kills, 0);
  const deaths = points.reduce((sum, point) => sum + point.deaths, 0);
  return deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
}

function periodDelta(metric: MetricKey, trend: TrendPoint[]): {
  current: number | null;
  previous: number | null;
  delta: number | null;
  deltaRatio: number | null;
} {
  if (trend.length < 4) {
    return { current: null, previous: null, delta: null, deltaRatio: null };
  }
  const capped = trend.slice(-30);
  const half = Math.floor(capped.length / 2);
  if (half < 2) return { current: null, previous: null, delta: null, deltaRatio: null };
  const previousSlice = capped.slice(0, half);
  const currentSlice = capped.slice(half);
  const previous = summarizePeriod(metric, previousSlice);
  const current = summarizePeriod(metric, currentSlice);
  if (previous == null || current == null) return { current, previous, delta: null, deltaRatio: null };
  const delta = current - previous;
  const deltaRatio = previous !== 0 ? delta / Math.abs(previous) : null;
  return { current, previous, delta, deltaRatio };
}

function TrendChart({
  metric,
  trend,
  showOverlays,
}: {
  metric: MetricKey;
  trend: TrendPoint[];
  showOverlays: boolean;
}) {
  const points = useMemo(() => buildMetricSeries(metric, trend), [metric, trend]);
  const overlayWinRate = useMemo(() => buildMetricSeries("winRate", trend), [trend]);
  const overlayKd = useMemo(() => buildMetricSeries("kd", trend), [trend]);
  const [animateKey, setAnimateKey] = useState(0);
  const labels = useMemo(
    () =>
      trend
        .slice(-30)
        .map((point) => ({
          gameCode: point.gameCode,
          occurredAt: point.occurredAt,
          mode: point.mode,
        })),
    [trend]
  );
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const delta = useMemo(() => periodDelta(metric, trend), [metric, trend]);

  useEffect(() => {
    setAnimateKey((current) => current + 1);
  }, [metric, trend]);

  const chartLabel = metric === "games" ? "Games" : metric === "winRate" ? "Win Rate" : metric === "kd" ? "K/D" : "Points";
  if (points.length < 2) {
    return (
      <section className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">{chartLabel} Trend Chart</h3>
        <p className="mt-2 text-sm text-white/60">Not enough session history to render a chart yet.</p>
      </section>
    );
  }

  const width = 860;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 34, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1e-6);
  const chartPoints = points.map((value, index) => {
    const x = padding.left + (index / (points.length - 1)) * innerWidth;
    const y = padding.top + (1 - (value - min) / range) * innerHeight;
    return { x, y, value, index };
  });
  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1]?.x.toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} L ${chartPoints[0]?.x.toFixed(2)} ${(padding.top + innerHeight).toFixed(2)} Z`;
  const overlayWinPath = buildOverlayPath({ series: overlayWinRate, width, height, padding });
  const overlayKdPath = buildOverlayPath({ series: overlayKd, width, height, padding });
  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, index) => {
    const ratio = index / yTicks;
    return max - ratio * range;
  });

  const hoverPoint = hoverIndex != null ? chartPoints[hoverIndex] : null;
  const hoverMeta = hoverIndex != null ? labels[hoverIndex] : null;

  return (
    <section className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">{chartLabel} Trend Chart</h3>
        {delta.delta != null ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              delta.delta >= 0
                ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                : "border-rose-300/40 bg-rose-400/10 text-rose-100"
            }`}
          >
            vs previous: {delta.delta >= 0 ? "+" : ""}
            {formatMetricValue(metric, delta.delta)}{" "}
            {delta.deltaRatio != null ? `(${delta.deltaRatio >= 0 ? "+" : ""}${(delta.deltaRatio * 100).toFixed(1)}%)` : ""}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-white/55">Hover points for session details. Series is based on your selected KPI.</p>
      <div className="mt-3 overflow-auto">
        <svg key={animateKey} viewBox={`0 0 ${width} ${height}`} className="h-[260px] min-w-[760px] w-full">
          <defs>
            <linearGradient id="memberTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(217,106,90,0.35)" />
              <stop offset="100%" stopColor="rgba(217,106,90,0.02)" />
            </linearGradient>
          </defs>
          <rect x={padding.left} y={padding.top} width={innerWidth} height={innerHeight} fill="rgba(255,255,255,0.02)" rx="8" />
          {tickValues.map((tickValue, index) => {
            const y = padding.top + (index / yTicks) * innerHeight;
            return (
              <g key={`y-tick-${index}`}>
                <line x1={padding.left} y1={y} x2={padding.left + innerWidth} y2={y} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.58)">
                  {formatMetricValue(metric, tickValue)}
                </text>
              </g>
            );
          })}
          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight}
            stroke="rgba(255,255,255,0.2)"
          />
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} stroke="rgba(255,255,255,0.2)" />
          <path d={areaPath} fill="url(#memberTrendFill)" />
          {showOverlays && overlayWinPath ? (
            <path d={overlayWinPath} fill="none" stroke="rgba(110,231,183,0.95)" strokeWidth="1.7" strokeDasharray="5 4" />
          ) : null}
          {showOverlays && overlayKdPath ? (
            <path d={overlayKdPath} fill="none" stroke="rgba(147,197,253,0.95)" strokeWidth="1.7" strokeDasharray="3 5" />
          ) : null}
          <path d={linePath} fill="none" stroke="rgba(217,106,90,0.95)" strokeWidth="2.5" className="transition-all duration-300" />
          {chartPoints.map((point) => (
            <circle
              key={`pt-${point.index}`}
              cx={point.x}
              cy={point.y}
              r={hoverIndex === point.index ? 5 : 3}
              fill={hoverIndex === point.index ? "rgba(255,255,255,0.98)" : "rgba(217,106,90,0.9)"}
              stroke="rgba(15,17,21,0.95)"
              strokeWidth="1.5"
              onMouseEnter={() => setHoverIndex(point.index)}
              onMouseLeave={() => setHoverIndex((current) => (current === point.index ? null : current))}
            />
          ))}
          <text x={padding.left} y={height - 10} fontSize="10" fill="rgba(255,255,255,0.55)">
            Oldest
          </text>
          <text x={padding.left + innerWidth} y={height - 10} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.55)">
            Latest
          </text>
          <text x={width / 2} y={height - 10} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">
            Sessions
          </text>
          <text
            x={14}
            y={padding.top + innerHeight / 2}
            transform={`rotate(-90 14 ${padding.top + innerHeight / 2})`}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.5)"
          >
            {chartLabel}
          </text>
          {hoverPoint && hoverMeta ? (
            <g>
              <line x1={hoverPoint.x} y1={padding.top} x2={hoverPoint.x} y2={padding.top + innerHeight} stroke="rgba(255,255,255,0.22)" strokeDasharray="3 3" />
            </g>
          ) : null}
        </svg>
      </div>
      {showOverlays ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-5 rounded-full bg-[#D96A5A]" /> Selected KPI
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-5 rounded-full bg-emerald-300" /> Win Rate overlay
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-5 rounded-full bg-blue-300" /> K/D overlay
          </span>
        </div>
      ) : null}
      {hoverPoint && hoverMeta ? (
        <div className="mt-3 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white/80">
          <span className="font-semibold text-white">{hoverMeta.gameCode}</span>
          <span className="mx-2 text-white/45">|</span>
          <span>{hoverMeta.mode ?? "unknown mode"}</span>
          <span className="mx-2 text-white/45">|</span>
          <span>{hoverMeta.occurredAt ? new Date(hoverMeta.occurredAt).toLocaleString() : "--"}</span>
          <span className="mx-2 text-white/45">|</span>
          <span className="font-semibold text-white">{chartLabel}: {formatMetricValue(metric, hoverPoint.value)}</span>
        </div>
      ) : null}
    </section>
  );
}

function KpiCard({
  label,
  value,
  metric,
  trend,
  timeframe,
  tone,
  onClick,
  selected,
}: {
  label: string;
  value: string;
  metric: MetricKey;
  trend: TrendPoint[];
  timeframe: Timeframe;
  tone: "good" | "watch" | "improve";
  onClick: () => void;
  selected: boolean;
}) {
  const toneClasses =
    tone === "good"
      ? "border-emerald-300/35 bg-emerald-400/8"
      : tone === "watch"
        ? "border-amber-300/35 bg-amber-400/8"
        : "border-rose-300/35 bg-rose-400/8";
  const points = useMemo(() => buildMetricSeries(metric, trend), [metric, trend]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition hover:bg-white/[0.06] ${toneClasses} ${selected ? "ring-2 ring-[#D96A5A]/50" : ""}`}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <p className="text-[11px] text-white/45">Trend ({timeframe.toUpperCase()})</p>
      {points.length >= 2 ? <Sparkline points={points} /> : <p className="mt-2 text-[11px] text-white/45">Not enough data yet</p>}
    </button>
  );
}

function resolveKpiModel(stats: MemberStatsSummary) {
  const winRate = safeRatio(stats.wins, stats.gamesPlayed);
  const kd = safeRatio(stats.kills, stats.deaths);
  const deathPressure = safeRatio(stats.deaths, Math.max(1, stats.gamesPlayed));

  return {
    games: {
      value: formatKpi(stats.gamesPlayed, 0),
      tone: "watch" as const,
    },
    winRate: {
      value: ratioToPercent(winRate),
      tone: (winRate ?? 0) >= 0.5 ? ("good" as const) : ("watch" as const),
    },
    kd: {
      value: formatKpi(kd, 2),
      tone: (kd ?? 0) >= 1 ? ("good" as const) : ("improve" as const),
    },
    points: {
      value: formatKpi(stats.lifetimePoints, 0),
      tone: (deathPressure ?? 0) > 2.5 ? ("watch" as const) : ("good" as const),
    },
  };
}

function metricValue(point: TrendPoint, metric: MetricKey): number | null {
  if (metric === "games") return 1;
  if (metric === "winRate") return point.won ? 1 : 0;
  if (metric === "kd") return point.deaths > 0 ? point.kills / point.deaths : point.kills > 0 ? point.kills : 0;
  return point.points;
}

function MetricDrilldown({ metric, trend }: { metric: MetricKey; trend: TrendPoint[] }) {
  const label = metric === "games" ? "Games" : metric === "winRate" ? "Win Rate" : metric === "kd" ? "K/D" : "Points";
  const recent = [...trend].slice(-20).reverse();
  return (
    <section className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/75">{label} Drill-down</h3>
      <p className="mt-1 text-xs text-white/55">Latest sessions contributing to the selected KPI.</p>
      <div className="mt-3 space-y-2">
        {recent.length === 0 ? (
          <p className="text-sm text-white/60">No session trend data available for the selected filter.</p>
        ) : (
          recent.map((point) => {
            const value = metricValue(point, metric);
            return (
              <div key={`${point.gameCode}-${point.occurredAt ?? "na"}`} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-white">{point.gameCode}</p>
                  <p className="text-xs text-white/55">
                    {point.mode ?? "unknown mode"} | {point.occurredAt ? new Date(point.occurredAt).toLocaleString() : "--"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-white">
                  {metric === "winRate" ? ratioToPercent(value) : formatKpi(value, metric === "games" || metric === "points" ? 0 : 2)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default function MembersStatsClient() {
  const { stats, user, profile } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("games");
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      setLoadingTrends(true);
      setTrendError(null);
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/members/stats/trends?timeframe=${encodeURIComponent(timeframe)}&mode=${encodeURIComponent(mode)}`,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        );
        const payload = (await response.json().catch(() => ({}))) as Partial<TrendsResponse> & { message?: string };
        if (cancelled) return;
        if (!response.ok) {
          setTrendError(payload.message ?? "Unable to load trends.");
          return;
        }
        setTrend(Array.isArray(payload.trend) ? (payload.trend as TrendPoint[]) : []);
      } catch {
        if (cancelled) return;
        setTrendError("Unable to load trends.");
      } finally {
        if (cancelled) return;
        setLoadingTrends(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, timeframe, user]);

  const activeStats = stats;
  const kpis = useMemo(() => resolveKpiModel(activeStats), [activeStats]);
  const achievementIds = useMemo(() => {
    const fromProfile = Array.isArray(profile?.achievementIds) ? profile.achievementIds : [];
    const fromAchievements = Array.isArray(profile?.achievements?.achievementIds) ? profile.achievements.achievementIds : [];
    const fromAwards = Array.isArray(profile?.awards?.achievementIds) ? profile.awards.achievementIds : [];
    return [...fromProfile, ...fromAchievements, ...fromAwards].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
  }, [profile]);
  const achievementBadgeAssetKeys = useMemo(() => {
    const root = sanitizeAchievementBadgeAssetKeys(profile?.achievementBadgeAssetKeys);
    if (Object.keys(root).length > 0) return root;
    const fromAchievements = profile?.achievements?.achievementBadgeAssetKeys;
    const achievementsMap = sanitizeAchievementBadgeAssetKeys(fromAchievements);
    if (Object.keys(achievementsMap).length > 0) return achievementsMap;
    const fromAwards = profile?.awards?.achievementBadgeAssetKeys;
    const awardsMap = sanitizeAchievementBadgeAssetKeys(fromAwards);
    if (Object.keys(awardsMap).length > 0) return awardsMap;
    return {};
  }, [profile]);
  const achievementProgress = useMemo(() => resolveAchievementProgress(activeStats, profile), [activeStats, profile]);

  return (
    <section className="space-y-6">
      <div className="border-t border-white/10 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Stats</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your performance</h2>
            <p className="mt-2 text-sm text-soft">Review your cumulative game metrics and trend indicators.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/15 bg-black/25 p-1">
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  timeframe === option.value ? "bg-[#D96A5A] text-white" : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                }`}
                onClick={() => setTimeframe(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <select
            className="rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
            value={mode}
            onChange={(event) => setMode(event.target.value as ModeFilter)}
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-xs text-white/80">
            <input type="checkbox" checked={showOverlays} onChange={(event) => setShowOverlays(event.target.checked)} />
            Show overlays
          </label>
          {loadingTrends ? <span className="text-xs text-white/55">Loading trends...</span> : null}
        </div>

        {trendError ? <p className="mt-2 text-xs text-amber-200">{trendError}</p> : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Games"
            value={kpis.games.value}
            metric="games"
            trend={trend}
            timeframe={timeframe}
            tone={kpis.games.tone}
            selected={selectedMetric === "games"}
            onClick={() => setSelectedMetric("games")}
          />
          <KpiCard
            label="Win Rate"
            value={kpis.winRate.value}
            metric="winRate"
            trend={trend}
            timeframe={timeframe}
            tone={kpis.winRate.tone}
            selected={selectedMetric === "winRate"}
            onClick={() => setSelectedMetric("winRate")}
          />
          <KpiCard
            label="K/D"
            value={kpis.kd.value}
            metric="kd"
            trend={trend}
            timeframe={timeframe}
            tone={kpis.kd.tone}
            selected={selectedMetric === "kd"}
            onClick={() => setSelectedMetric("kd")}
          />
          <KpiCard
            label="Lifetime Points"
            value={kpis.points.value}
            metric="points"
            trend={trend}
            timeframe={timeframe}
            tone={kpis.points.tone}
            selected={selectedMetric === "points"}
            onClick={() => setSelectedMetric("points")}
          />
        </div>
      </div>

      <MetricDrilldown metric={selectedMetric} trend={trend} />
      <TrendChart metric={selectedMetric} trend={trend} showOverlays={showOverlays} />
      <AchievementsPanel
        achievementIds={achievementIds}
        achievementBadgeAssetKeys={achievementBadgeAssetKeys}
        stats={activeStats}
        progress={achievementProgress}
      />

      <StatsPanel stats={activeStats} timeframe={timeframe} />
    </section>
  );
}
