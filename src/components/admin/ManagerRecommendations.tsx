import { normalizeRatioMetric, toNullableNumber } from "@wurder/shared-analytics";
import type { PlayerPerformance } from "@wurder/shared-analytics";

import type { ManagerInsight } from "@/components/admin/types";

type ManagerSessionSummary = {
  totalSessions: number;
};

type ManagerRecommendation = {
  id: string;
  title: string;
  reason: string;
  action: string;
};

type ManagerRecommendationsProps = {
  summary: ManagerSessionSummary;
  insights: ManagerInsight[];
  players: PlayerPerformance[];
};

function findInsight(insights: ManagerInsight[], token: string): ManagerInsight | null {
  return insights.find((insight) => insight.label.toLowerCase().includes(token.toLowerCase())) ?? null;
}

function getManagerRecommendations({ summary, insights, players }: ManagerRecommendationsProps): ManagerRecommendation[] {
  const recommendations: ManagerRecommendation[] = [];

  if ((summary.totalSessions ?? 0) <= 0) {
    recommendations.push({
      id: "no-session-history",
      title: "Collect baseline session data",
      reason: "No completed sessions are available yet, so trend confidence is low.",
      action: "Run at least one full session and review this dashboard again before changing roster strategy.",
    });
    return recommendations;
  }

  const topDeathPlayer = [...players]
    .filter((player) => toNullableNumber(player.deaths) != null)
    .sort((a, b) => (toNullableNumber(b.deaths) ?? 0) - (toNullableNumber(a.deaths) ?? 0))[0];

  if (topDeathPlayer && (toNullableNumber(topDeathPlayer.deaths) ?? 0) >= 10) {
    recommendations.push({
      id: "deaths-focus",
      title: `Stabilize ${topDeathPlayer.playerName}'s survival patterns`,
      reason: `${topDeathPlayer.playerName} is carrying the highest death load (${topDeathPlayer.deaths}).`,
      action: "Set a short coaching block on positioning, trade timing, and disengage calls for next session.",
    });
  }

  const disputeRateInsight = findInsight(insights, "dispute rate");
  if (disputeRateInsight && disputeRateInsight.message?.toLowerCase().includes("above")) {
    recommendations.push({
      id: "dispute-rate",
      title: "Tighten claim validation workflow",
      reason: disputeRateInsight.message,
      action: "Assign one rules lead per match to verify claims in real time and reduce post-match disputes.",
    });
  }

  const lowAccuracyPlayers = players.filter((player) => {
    const accuracy = normalizeRatioMetric(player.accuracy ?? player.successRate ?? null);
    return (accuracy ?? 0) > 0 && (accuracy ?? 0) < 0.4;
  });

  if (lowAccuracyPlayers.length > 0) {
    recommendations.push({
      id: "accuracy-drill",
      title: "Run precision-focused warmups",
      reason: `${lowAccuracyPlayers.length} active player(s) are below 40% accuracy and may be missing finishing opportunities.`,
      action: "Start upcoming sessions with a short accuracy drill and review shot selection after each round.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "maintain-rhythm",
      title: "Maintain current operating rhythm",
      reason: "Current metrics do not show a single urgent risk signal.",
      action: "Keep regular review cadence and monitor shifts in dispute rate, deaths, and accuracy over the next sessions.",
    });
  }

  return recommendations.slice(0, 3);
}

export default function ManagerRecommendations({ summary, insights, players }: ManagerRecommendationsProps) {
  const recommendations = getManagerRecommendations({ summary, insights, players });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Manager Recommendations</h2>
      <div className="mt-4 grid gap-3">
        {recommendations.map((recommendation) => (
          <article key={recommendation.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-900">{recommendation.title}</h3>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Reason:</span> {recommendation.reason}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Action:</span> {recommendation.action}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
