import type { ManagerInsight } from "@/components/admin/types";

type InsightsPanelProps = {
  insights: ManagerInsight[];
};

function formatInsightValue(insight: ManagerInsight): string {
  if (insight.value == null) return "--";
  if (insight.unit === "ratio") return `${(insight.value * 100).toFixed(1)}%`;
  if (insight.unit === "ms") return `${insight.value.toLocaleString()} ms`;
  return insight.value.toLocaleString();
}

function SeverityBadge({ severity }: { severity: ManagerInsight["severity"] }) {
  const cls =
    severity === "critical"
      ? "border-red-300/45 bg-red-500/15 text-red-100"
      : severity === "warning"
        ? "border-amber-300/45 bg-amber-500/15 text-amber-100"
        : "border-white/20 bg-white/10 text-white/80";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{severity}</span>;
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <section className="surface-panel p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Insights</h2>
        <span className="text-xs text-white/55">{insights.length} signals</span>
      </div>
      {insights.length === 0 ? (
        <p className="surface-panel-muted mt-3 p-3 text-sm text-white/70">No insight metrics available yet for this session.</p>
      ) : (
        <div className="relative mt-3">
          <div className="surface-panel-muted scroll-chrome max-h-[24rem] overflow-auto">
            {insights.map((insight) => (
              <article key={insight.id} className="border-b border-white/8 p-3 last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/65">{insight.label}</p>
                  <SeverityBadge severity={insight.severity} />
                </div>
                <p className="mt-1 text-sm font-semibold text-white">{formatInsightValue(insight)}</p>
                <p className="mt-1 text-xs text-white/65">{insight.message}</p>
              </article>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-1 top-1 h-5 rounded-t-lg bg-gradient-to-b from-[#111624] to-transparent" />
          <div className="pointer-events-none absolute inset-x-1 bottom-1 h-5 rounded-b-lg bg-gradient-to-t from-[#111624] to-transparent" />
        </div>
      )}
    </section>
  );
}
