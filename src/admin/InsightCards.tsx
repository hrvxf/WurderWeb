import type { ManagerInsight } from "@/admin/types";

type InsightCardsProps = {
  insights: ManagerInsight[];
};

export default function InsightCards({ insights }: InsightCardsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {insights.map((insight) => (
          <article key={insight.label} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">{insight.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{insight.value.toLocaleString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
