import type {
  ManagerGameOverview,
  ManagerInsight,
  ManagerPlayerPerformance,
  ManagerSessionSummary,
} from "@/components/admin/types";

export type ChartValueUnit = "count" | "ratio" | "ms";

export type ChartBarDatum = {
  id: string;
  label: string;
  value: number;
  unit: ChartValueUnit;
};

export type ChartScatterDatum = {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
};

export function buildInsightBarSeries(insights: ManagerInsight[], maxItems = 8): ChartBarDatum[] {
  return insights
    .filter((insight) => insight.value != null && Number.isFinite(insight.value))
    .slice()
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, maxItems)
    .map((insight) => ({
      id: insight.id,
      label: insight.label,
      value: insight.value ?? 0,
      unit: insight.unit,
    }));
}

export function buildClaimsFunnelSeries(summary: ManagerSessionSummary): ChartBarDatum[] {
  return [
    { id: "submitted", label: "Claims Submitted", value: summary.totalClaimsSubmitted, unit: "count" as const },
    {
      id: "confirmed",
      label: "Claims Confirmed",
      value: summary.totalClaimsSubmitted - summary.totalClaimsDenied,
      unit: "count" as const,
    },
    { id: "denied", label: "Claims Denied", value: summary.totalClaimsDenied, unit: "count" as const },
  ].map((item) => ({ ...item, value: Math.max(0, item.value) }));
}

export function buildPlayerScatterSeries(players: ManagerPlayerPerformance[]): ChartScatterDatum[] {
  return players
    .filter((player) => player.accuracyRatio != null && player.kdRatio != null)
    .map((player) => ({
      id: player.playerId,
      label: player.displayName,
      x: Math.max(0, player.accuracyRatio ?? 0),
      y: Math.max(0, player.kdRatio ?? 0),
      size: Math.max(1, player.kills ?? 0),
    }));
}

export function buildDeathsBasisSeries(players: ManagerPlayerPerformance[]): ChartBarDatum[] {
  const counts = new Map<ManagerPlayerPerformance["deathsBasis"], number>([
    ["confirmed_claims_against_player", 0],
    ["elimination_deaths", 0],
    ["fallback_death_events", 0],
  ]);
  for (const player of players) {
    counts.set(player.deathsBasis, (counts.get(player.deathsBasis) ?? 0) + 1);
  }
  return [...counts.entries()].map(([basis, value]) => ({
    id: basis,
    label: basis.replace(/_/g, " "),
    value,
    unit: "count",
  }));
}

export function buildOverviewSnapshot(overview: ManagerGameOverview): ChartBarDatum[] {
  return [
    { id: "players", label: "Players", value: overview.totalPlayers, unit: "count" as const },
    { id: "sessions", label: "Sessions", value: overview.totalSessions, unit: "count" as const },
    { id: "events", label: "Events", value: overview.totalEvents, unit: "count" as const },
  ];
}
