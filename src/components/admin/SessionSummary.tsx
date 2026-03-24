import { displaySafeDurationSeconds, displaySafePercent } from "@wurder/shared-analytics";

import type {
  ManagerGameOverview,
  ManagerInsight,
  ManagerPlayerPerformance,
  ManagerSessionSummary,
} from "@/components/admin/types";

type SessionSummaryProps = {
  summary: ManagerSessionSummary;
  overview: ManagerGameOverview;
  insights: ManagerInsight[];
  players: ManagerPlayerPerformance[];
};

function formatDate(value: string | null): string {
  if (!value) return "--";

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "--";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(asDate);
}

function findTopPerformer(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  const eligible = players.filter((player) => player.kills != null && player.sessionCount != null);
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => {
    if ((b.kills ?? 0) !== (a.kills ?? 0)) return (b.kills ?? 0) - (a.kills ?? 0);
    if ((b.accuracyPct ?? 0) !== (a.accuracyPct ?? 0)) return (b.accuracyPct ?? 0) - (a.accuracyPct ?? 0);
    if ((b.kdRatio ?? 0) !== (a.kdRatio ?? 0)) return (b.kdRatio ?? 0) - (a.kdRatio ?? 0);
    return (b.sessionCount ?? 0) - (a.sessionCount ?? 0);
  })[0] ?? null;
}

function findCommunicator(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  const active = players.filter((player) => (player.sessionCount ?? 0) > 0 && player.accuracyPct != null);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if ((b.accuracyPct ?? 0) !== (a.accuracyPct ?? 0)) return (b.accuracyPct ?? 0) - (a.accuracyPct ?? 0);
    if ((b.sessionCount ?? 0) !== (a.sessionCount ?? 0)) return (b.sessionCount ?? 0) - (a.sessionCount ?? 0);
    if ((b.kills ?? 0) !== (a.kills ?? 0)) return (b.kills ?? 0) - (a.kills ?? 0);
    return (b.kdRatio ?? 0) - (a.kdRatio ?? 0);
  })[0] ?? null;
}

function findCoachingRisk(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  const active = players.filter((player) => (player.sessionCount ?? 0) > 0 && player.deaths != null && player.kdRatio != null);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if ((b.deaths ?? 0) !== (a.deaths ?? 0)) return (b.deaths ?? 0) - (a.deaths ?? 0);
    if ((a.kdRatio ?? 0) !== (b.kdRatio ?? 0)) return (a.kdRatio ?? 0) - (b.kdRatio ?? 0);
    if ((a.accuracyPct ?? 0) !== (b.accuracyPct ?? 0)) return (a.accuracyPct ?? 0) - (b.accuracyPct ?? 0);
    return (b.sessionCount ?? 0) - (a.sessionCount ?? 0);
  })[0] ?? null;
}

function isTeamMode(overview: ManagerGameOverview, insights: ManagerInsight[]): boolean {
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

function Finding({
  label,
  headline,
  interpretation,
}: {
  label: string;
  headline: string;
  interpretation: string;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{headline}</p>
      <p className="mt-1 text-xs text-slate-600">{interpretation}</p>
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

  const totalKills = players.reduce((acc, player) => acc + (player.kills ?? 0), 0);
  const totalDeaths = players.reduce((acc, player) => acc + (player.deaths ?? 0), 0);
  const disputes = findMetric(insights, "dispute");
  const claims = findMetric(insights, "claim");
  const singlePlayer = players.length === 1;

  const observationExtras = [
    disputes === 0 ? "0 disputes recorded." : null,
    claims === 0 ? "0 claims recorded." : null,
    singlePlayer ? "Single-player session; peer comparison is limited." : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Session Summary</h2>
      <div className="mt-4 grid gap-3">
        {availableFindings > 0 ? (
          <>
            {topPerformer ? (
            <Finding
              label="Top Performer"
              headline={`${topPerformer.displayName}: ${topPerformer.kills} eliminations${topPerformer.kdRatio != null ? `, ${topPerformer.kdRatio.toFixed(2)} K/D` : ""}`}
              interpretation={`Highest output in the current roster across ${topPerformer.sessionCount} sessions.`}
            />
            ) : null}

            {communicator ? (
            <Finding
              label="Most Effective Communicator"
              headline={`${communicator.displayName}: ${displaySafePercent(communicator.accuracyPct, "--", 0)} accuracy`}
              interpretation={`Best precision signal across ${communicator.sessionCount} sessions, supporting reliable callout execution.`}
            />
            ) : null}

            {coachingRisk ? (
            <Finding
              label="Risk / Coaching Needed"
              headline={`${coachingRisk.displayName}: ${coachingRisk.deaths} deaths, ${coachingRisk.kdRatio?.toFixed(2)} K/D`}
              interpretation="Highest death load in the roster; prioritize positioning and trade-timing coaching."
            />
            ) : null}
          </>
        ) : (
          <p className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
            Not enough completed session data yet.
          </p>
        )}

        <Finding
          label="Session-Wide Observation"
          headline={`${summary.totalSessions.toLocaleString()} sessions, average ${displaySafeDurationSeconds(summary.avgSessionLengthSeconds)}`}
          interpretation={`Longest session ${displaySafeDurationSeconds(summary.longestSessionSeconds)}. Last session ${formatDate(summary.lastSessionAt)}. Total eliminations ${totalKills}, total deaths ${totalDeaths}.${observationExtras ? ` ${observationExtras}` : ""}`}
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
