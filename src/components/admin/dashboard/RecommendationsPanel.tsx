import type { ManagerRecommendation } from "@/components/admin/types";

type RecommendationsPanelProps = {
  recommendations: ManagerRecommendation[];
};

export default function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return (
      <section className="rounded-xl border border-white/12 bg-white/[0.03] p-3 text-sm text-white/70">
        No recommendations available yet.
      </section>
    );
  }

  return (
    <section className="space-y-2">
      {recommendations.map((recommendation) => (
        <article key={recommendation.id} className="rounded-xl border border-white/12 bg-white/[0.03] p-3">
          <p className="text-sm font-semibold text-white">{recommendation.title}</p>
          <p className="mt-1 text-xs text-white/70">{recommendation.reason}</p>
          <p className="mt-1 text-xs text-white/75">Action: {recommendation.action}</p>
        </article>
      ))}
    </section>
  );
}
