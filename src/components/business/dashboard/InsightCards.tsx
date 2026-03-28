import type { ManagerInsight } from "@/components/business/dashboard/types";

type InsightCardsProps = {
  insights: ManagerInsight[];
};

function severityTone(severity: ManagerInsight["severity"]): string {
  if (severity === "critical") return "var(--mc-alert)";
  if (severity === "warning") return "var(--mc-warning)";
  return "var(--mc-primary)";
}

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
    <section className="mission-control__panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="mission-control__display text-lg font-semibold text-[var(--mc-text)]">KPI Radar</h2>
        <p className="mission-control__label">Signal Feed</p>
      </div>
      {insights.length > 0 ? (
        <div className="mission-control__kpi-grid mt-4">
          {insights.map((insight) => {
            const subtext = formatInsightSubtext(insight);
            const tone = severityTone(insight.severity);
            return (
              <article
                key={insight.id}
                className="mission-control__panel-alt p-3"
                style={{ boxShadow: `inset 2px 0 0 ${tone}` }}
              >
                <p className="mission-control__label">{insight.label}</p>
                <p className="mission-control__display mt-2 text-2xl font-semibold text-[var(--mc-text)]">{formatInsightValue(insight)}</p>
                <p className="mt-1 text-sm font-medium text-[var(--mc-text-soft)]">
                  {insight.message || `${insight.label} signal captured`}
                </p>
                {subtext ? <p className="mt-2 text-xs text-[var(--mc-text-muted)]">{subtext}</p> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mission-control__panel-alt mt-4 p-3 text-sm text-[var(--mc-text-soft)]">
          No insight metrics available yet for this session.
        </p>
      )}
    </section>
  );
}
