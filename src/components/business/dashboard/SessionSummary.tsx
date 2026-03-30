import {
  computeDisputeRate,
  deriveSessionStatus,
  normalizeRatioMetric,
  toNullableNumber,
} from "@wurder/shared-analytics";
import type { PlayerPerformance } from "@wurder/shared-analytics";

import type { ManagerInsight, ManagerOverview, ManagerSessionSummary } from "@/components/business/dashboard/types";

type SessionSummaryProps = {
  summary: ManagerSessionSummary;
  overview: ManagerOverview;
  insights: ManagerInsight[];
  players: PlayerPerformance[];
};

function formatDuration(seconds: number | null): string {
  if (!Number.isFinite(seconds ?? NaN) || (seconds ?? 0) <= 0) return "--";
  const durationSeconds = seconds ?? 0;
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatDate(value: string | null): string {
  if (!value) return "--";

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "--";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(asDate);
}

function formatPercent(value: number | null | undefined): string {
  const normalizedRatio = normalizeRatioMetric(value ?? null);
  if (!Number.isFinite(normalizedRatio ?? NaN) || (normalizedRatio ?? 0) <= 0) return "--";
  return `${Math.round((normalizedRatio ?? 0) * 100)}%`;
}

function findTopPerformer(players: PlayerPerformance[]): PlayerPerformance | null {
  if (players.length === 0) return null;
  return [...players].sort((a, b) => {
    if ((toNullableNumber(b.kills ?? b.confirmedKills) ?? 0) !== (toNullableNumber(a.kills ?? a.confirmedKills) ?? 0)) {
      return (toNullableNumber(b.kills ?? b.confirmedKills) ?? 0) - (toNullableNumber(a.kills ?? a.confirmedKills) ?? 0);
    }
    if ((normalizeRatioMetric(b.accuracy ?? b.successRate ?? null) ?? 0) !== (normalizeRatioMetric(a.accuracy ?? a.successRate ?? null) ?? 0)) {
      return (normalizeRatioMetric(b.accuracy ?? b.successRate ?? null) ?? 0) - (normalizeRatioMetric(a.accuracy ?? a.successRate ?? null) ?? 0);
    }
    return (toNullableNumber(b.kd) ?? 0) - (toNullableNumber(a.kd) ?? 0);
  })[0] ?? null;
}

function findCommunicator(players: PlayerPerformance[]): PlayerPerformance | null {
  const active = players.filter((player) => normalizeRatioMetric(player.accuracy ?? player.successRate ?? null) != null);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if ((normalizeRatioMetric(b.accuracy ?? b.successRate ?? null) ?? 0) !== (normalizeRatioMetric(a.accuracy ?? a.successRate ?? null) ?? 0)) {
      return (normalizeRatioMetric(b.accuracy ?? b.successRate ?? null) ?? 0) - (normalizeRatioMetric(a.accuracy ?? a.successRate ?? null) ?? 0);
    }
    if ((toNullableNumber(b.kills ?? b.confirmedKills) ?? 0) !== (toNullableNumber(a.kills ?? a.confirmedKills) ?? 0)) {
      return (toNullableNumber(b.kills ?? b.confirmedKills) ?? 0) - (toNullableNumber(a.kills ?? a.confirmedKills) ?? 0);
    }
    return (toNullableNumber(b.kd) ?? 0) - (toNullableNumber(a.kd) ?? 0);
  })[0] ?? null;
}

function findCoachingRisk(players: PlayerPerformance[]): PlayerPerformance | null {
  const active = players.filter((player) => toNullableNumber(player.deaths) != null && toNullableNumber(player.kd) != null);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if ((toNullableNumber(b.deaths) ?? 0) !== (toNullableNumber(a.deaths) ?? 0)) return (toNullableNumber(b.deaths) ?? 0) - (toNullableNumber(a.deaths) ?? 0);
    if ((toNullableNumber(a.kd) ?? 0) !== (toNullableNumber(b.kd) ?? 0)) return (toNullableNumber(a.kd) ?? 0) - (toNullableNumber(b.kd) ?? 0);
    return (normalizeRatioMetric(a.accuracy ?? a.successRate ?? null) ?? 0) - (normalizeRatioMetric(b.accuracy ?? b.successRate ?? null) ?? 0);
  })[0] ?? null;
}

function isTeamMode(overview: ManagerOverview, insights: ManagerInsight[]): boolean {
  const mode = (overview.mode ?? "").toLowerCase();
  if (mode.includes("guild") || mode.includes("team")) return true;

  return insights.some((insight) => {
    const label = insight.label.toLowerCase();
    return label.includes("team") || label.includes("guild");
  });
}

function teamInsights(insights: ManagerInsight[]): ManagerInsight[] {
  return insights.filter((insight) => {
    const label = insight.label.toLowerCase();
    return label.includes("team") || label.includes("guild");
  });
}

function findMetric(insights: ManagerInsight[], token: string): number | null {
  const match = insights.find((insight) => insight.label.toLowerCase().includes(token));
  return match ? match.value : null;
}

function Finding({ label, headline, interpretation }: { label: string; headline: string; interpretation: string }) {
  return (
    <article className="border-l-2 border-[var(--mc-border)] py-1.5 pl-3">
      <p className="mission-control__label">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--mc-text)]">{headline}</p>
      <p className="mt-1 text-xs text-[var(--mc-text-soft)]">{interpretation}</p>
    </article>
  );
}

export default function SessionSummary({ summary, overview, insights, players }: SessionSummaryProps) {
  const topPerformer = findTopPerformer(players);
  const communicator = findCommunicator(players);
  const coachingRisk = findCoachingRisk(players);
  const availableFindings = [topPerformer, communicator, coachingRisk].filter(Boolean).length;
  const appliesTeamMode = isTeamMode(overview, insights);
  const teamMetrics = teamInsights(insights).slice(0, 2);

  const totalKills = players.reduce((acc, player) => acc + (toNullableNumber(player.kills ?? player.confirmedKills) ?? 0), 0);
  const totalDeaths = players.reduce((acc, player) => acc + (toNullableNumber(player.deaths) ?? 0), 0);
  const disputes = findMetric(insights, "dispute");
  const claims = findMetric(insights, "claim");
  const insightDisputeRate = claims != null ? computeDisputeRate(disputes ?? 0, claims) : null;
  const sessionStatus = deriveSessionStatus({
    startedAtMs: summary.startedAt ? new Date(summary.startedAt).getTime() : null,
    endedAtMs: summary.endedAt ? new Date(summary.endedAt).getTime() : null,
  });

  const observationExtras = [
    disputes === 0 ? "0 disputes recorded." : null,
    claims === 0 ? "0 claims recorded." : null,
    insightDisputeRate != null ? `Dispute rate ${Math.round(insightDisputeRate * 100)}%.` : null,
    players.length === 1 ? "Single-player session; peer comparison is limited." : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="mission-control__panel p-3.5 sm:p-4">
      <h2 className="mission-control__display text-lg font-semibold text-[var(--mc-text)]">Session Summary</h2>
      <div className="mt-3 grid gap-3 border-t border-[var(--mc-border)] pt-2.5">
        {availableFindings > 0 ? (
          <>
            {topPerformer ? (
              <Finding
                label="Top Performer"
                headline={`${topPerformer.playerName}: ${toNullableNumber(topPerformer.kills ?? topPerformer.confirmedKills) ?? 0} eliminations${topPerformer.kd != null ? `, ${toNullableNumber(topPerformer.kd)?.toFixed(2)} K/D` : ""}`}
                interpretation="Highest output in the current roster."
              />
            ) : null}

            {communicator ? (
              <Finding
                label="Most Effective Communicator"
                headline={`${communicator.playerName}: ${formatPercent(communicator.accuracy ?? communicator.successRate)} accuracy`}
                interpretation="Best precision signal in this roster snapshot."
              />
            ) : null}

            {coachingRisk ? (
              <Finding
                label="Risk / Coaching Needed"
                headline={`${coachingRisk.playerName}: ${coachingRisk.deaths} deaths, ${toNullableNumber(coachingRisk.kd)?.toFixed(2)} K/D`}
                interpretation="Highest death load in the roster; prioritize positioning and trade-timing coaching."
              />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--mc-text-soft)]">Not enough completed session data yet.</p>
        )}

        <Finding
          label="Session-Wide Observation"
          headline={`${summary.totalSessions.toLocaleString()} sessions, average ${formatDuration(summary.avgSessionLengthSeconds)}`}
          interpretation={`Status ${sessionStatus}. Longest session ${formatDuration(summary.longestSessionSeconds)}. Last session ${formatDate(summary.lastSessionAt)}. Total eliminations ${totalKills}, total deaths ${totalDeaths}.${observationExtras ? ` ${observationExtras}` : ""}`}
        />

        {appliesTeamMode ? (
          <Finding
            label="Team Comparison"
            headline={
              teamMetrics.length > 0
                ? teamMetrics.map((metric) => `${metric.label}: ${metric.value.toLocaleString()}`).join(" | ")
                : "Team mode detected, but no team-level metrics are present in aggregated analytics"
            }
            interpretation={
              teamMetrics.length > 0
                ? "Use the highest and lowest team metric values to target coaching and resourcing."
                : "Add team-level aggregates in the analytics pipeline if team-to-team benchmarking is required."
            }
          />
        ) : null}
      </div>
    </section>
  );
}
