import type { ManagerInsight } from "@/components/admin/types";

type InsightCardsProps = {
  insights: ManagerInsight[];
};

function formatMetricValue(metric: string, value: number): string {
  return metric.toLowerCase().includes("rate") ? `${value.toFixed(1)}%` : value.toLocaleString();
}

function formatInsightSubtext(insight: ManagerInsight): string | null {
  if (!insight.triggeredBy || insight.triggeredBy.length === 0) return null;
  return insight.triggeredBy
    .map((trigger) => {
      const actual = formatMetricValue(trigger.metric, trigger.actual);
      const expected = formatMetricValue(trigger.metric, trigger.expected);
      return `${trigger.metric}: ${actual} (expected ${trigger.comparator} ${expected})`;
    })
    .join(" • ");
}

export default function InsightCards({ insights }: InsightCardsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Activity Summary</h2>
      {insights.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((insight) => {
            const subtext = formatInsightSubtext(insight);
            return (
              <article key={insight.label} className="rounded-md bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{insight.label}</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {insight.message ?? `${insight.label}: ${insight.value.toLocaleString()}`}
                </p>
                {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          No insight metrics available yet for this session.
        </p>
      )}
    </section>
  );
}
