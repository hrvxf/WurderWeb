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

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

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

function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${Math.round(value)}%`;
}

function findTopPerformer(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  if (players.length === 0) return null;
  return [...players].sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    if (b.kdRatio !== a.kdRatio) return b.kdRatio - a.kdRatio;
    if (b.accuracyPct !== a.accuracyPct) return b.accuracyPct - a.accuracyPct;
    return b.sessionCount - a.sessionCount;
  })[0] ?? null;
}

function findCommunicator(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  const active = players.filter((player) => player.sessionCount > 0);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if (b.accuracyPct !== a.accuracyPct) return b.accuracyPct - a.accuracyPct;
    if (b.sessionCount !== a.sessionCount) return b.sessionCount - a.sessionCount;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.kdRatio - a.kdRatio;
  })[0] ?? null;
}

function findCoachingRisk(players: ManagerPlayerPerformance[]): ManagerPlayerPerformance | null {
  const active = players.filter((player) => player.sessionCount > 0);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    if (b.deaths !== a.deaths) return b.deaths - a.deaths;
    if (a.kdRatio !== b.kdRatio) return a.kdRatio - b.kdRatio;
    if (a.accuracyPct !== b.accuracyPct) return a.accuracyPct - b.accuracyPct;
    return b.sessionCount - a.sessionCount;
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
  const appliesTeamMode = isTeamMode(overview, insights);
  const teamMetrics = teamInsights(insights).slice(0, 2);

  const totalKills = players.reduce((acc, player) => acc + player.kills, 0);
  const totalDeaths = players.reduce((acc, player) => acc + player.deaths, 0);
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
        <Finding
          label="Top Performer"
          headline={
            topPerformer
              ? `${topPerformer.displayName}: ${topPerformer.kills} eliminations, ${topPerformer.kdRatio.toFixed(2)} K/D`
              : "No player performance data yet"
          }
          interpretation={
            topPerformer
              ? `Highest output in the current roster across ${topPerformer.sessionCount} sessions.`
              : "The aggregated analytics doc has no player rows to rank."
          }
        />

        <Finding
          label="Most Effective Communicator"
          headline={
            communicator
              ? `${communicator.displayName}: ${formatPercent(communicator.accuracyPct)} accuracy`
              : "No communication proxy available yet"
          }
          interpretation={
            communicator
              ? `Best precision signal across ${communicator.sessionCount} sessions, supporting reliable callout execution.`
              : "No player with tracked sessions is available for accuracy-based comparison."
          }
        />

        <Finding
          label="Risk / Coaching Needed"
          headline={
            coachingRisk
              ? `${coachingRisk.displayName}: ${coachingRisk.deaths} defeats/caught, ${coachingRisk.kdRatio.toFixed(2)} K/D`
              : "No coaching risk identified"
          }
          interpretation={
            coachingRisk
              ? "Highest defeated/caught load in the roster; prioritize positioning and trade-timing coaching."
              : "No active-session player data is available for risk scoring."
          }
        />

        <Finding
          label="Session-Wide Observation"
          headline={`${summary.totalSessions.toLocaleString()} sessions, average ${formatDuration(summary.avgSessionLengthSeconds)}`}
          interpretation={`Longest session ${formatDuration(summary.longestSessionSeconds)}. Last session ${formatDate(summary.lastSessionAt)}. Total eliminations ${totalKills}, total defeats/caught ${totalDeaths}.${observationExtras ? ` ${observationExtras}` : ""}`}
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
