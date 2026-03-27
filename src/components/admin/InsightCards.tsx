import type { ManagerInsight } from "@/components/admin/types";

type InsightCardsProps = {
  insights: ManagerInsight[];
};

function formatMetricValue(metric: string, value: number): string {
  return metric.toLowerCase().includes("rate") ? `${(value * 100).toFixed(1)}%` : value.toLocaleString();
}

function formatInsightSubtext(insight: ManagerInsight): string | null {
  if (!insight.evidence || insight.evidence.length === 0) return null;
  return insight.evidence
    .map((entry) => {
      const actual = formatMetricValue(entry.metric, entry.actual);
      const expected = formatMetricValue(entry.metric, entry.expected);
      return `${entry.metric}: ${actual} (expected ${entry.comparator} ${expected})`;
    })
    .join(" | ");
}

function formatInsightValue(insight: ManagerInsight): string {
  if (insight.value == null) return "--";
  if (insight.unit === "ratio") return `${(insight.value * 100).toFixed(1)}%`;
  if (insight.unit === "ms") return `${insight.value.toLocaleString()} ms`;
  return insight.value.toLocaleString();
}

export default function InsightCards({ insights }: InsightCardsProps) {
  return (
    <section className="surface-light p-4">
      <h2 className="text-lg font-semibold text-slate-900">Activity Summary</h2>
      {insights.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((insight) => {
            const subtext = formatInsightSubtext(insight);
            return (
              <article key={insight.id} className="surface-light-muted p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{insight.label}</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {insight.message ?? `${insight.label}: ${formatInsightValue(insight)}`}
                </p>
                {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 surface-light-muted p-3 text-sm text-slate-600">
          No insight metrics available yet for this session.
        </p>
      )}
    </section>
  );
}
