import type {
  ManagerDashboardInsight,
  ManagerPlayerPerformance,
  ManagerRecommendation,
  ManagerSessionSummary,
} from "@/domain/manager-dashboard/types";

type RecommendationInput = {
  summary: ManagerSessionSummary;
  insights: ManagerDashboardInsight[];
  players: ManagerPlayerPerformance[];
};

function findInsight(insights: ManagerDashboardInsight[], id: string): ManagerDashboardInsight | null {
  return insights.find((insight) => insight.id === id) ?? null;
}

export function buildRecommendations({ summary, insights, players }: RecommendationInput): ManagerRecommendation[] {
  const recommendations: ManagerRecommendation[] = [];

  if (summary.totalSessions <= 0) {
    return [
      {
        id: "no-session-history",
        category: "operations",
        priority: "medium",
        title: "Collect baseline session data",
        reason: "No completed sessions are available yet, so trend confidence is low.",
        action: "Run at least one full session and review this dashboard again before changing roster strategy.",
        basedOn: ["session_total"],
      },
    ];
  }

  if (summary.coachingRisk && (summary.coachingRisk.deaths ?? 0) >= 10) {
    recommendations.push({
      id: "deaths-focus",
      category: "risk",
      priority: "high",
      title: `Stabilize ${summary.coachingRisk.displayName}'s survival patterns`,
      reason: `${summary.coachingRisk.displayName} is carrying the highest death load (${summary.coachingRisk.deaths}).`,
      action: "Set a short coaching block on positioning, trade timing, and disengage calls for next session.",
      basedOn: ["death_load"],
    });
  }

  const disputeRateInsight = findInsight(insights, "dispute_rate");
  if (disputeRateInsight?.severity === "warning" || disputeRateInsight?.severity === "critical") {
    recommendations.push({
      id: "dispute-rate",
      category: "operations",
      priority: disputeRateInsight.severity === "critical" ? "high" : "medium",
      title: "Tighten claim validation workflow",
      reason: disputeRateInsight.message,
      action: "Assign one rules lead per match to verify claims in real time and reduce post-match disputes.",
      basedOn: ["dispute_rate"],
    });
  }

  const lowAccuracyPlayers = players.filter(
    (player) => (player.sessionCount ?? 0) > 0 && (player.accuracyRatio ?? 0) > 0 && (player.accuracyRatio ?? 0) < 0.4
  );
  if (lowAccuracyPlayers.length > 0) {
    recommendations.push({
      id: "accuracy-drill",
      category: "performance",
      priority: "medium",
      title: "Run precision-focused warmups",
      reason: `${lowAccuracyPlayers.length} active player(s) are below 40% accuracy and may be missing finishing opportunities.`,
      action: "Start upcoming sessions with a short accuracy drill and review shot selection after each round.",
      basedOn: ["accuracy_ratio"],
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "maintain-rhythm",
      category: "operations",
      priority: "low",
      title: "Maintain current operating rhythm",
      reason: "Current metrics do not show a single urgent risk signal.",
      action: "Keep regular review cadence and monitor shifts in dispute rate, deaths, and accuracy over the next sessions.",
      basedOn: ["stability"],
    });
  }

  return recommendations.slice(0, 3);
}
