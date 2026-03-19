import type { ManagerInsight } from "@/components/admin/types";

type InsightCardsProps = {
  insights: ManagerInsight[];
};

export default function InsightCards({ insights }: InsightCardsProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Activity Summary</h2>
      {insights.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.map((insight) => (
            <article key={insight.label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{insight.label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{insight.value.toLocaleString()}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          No insight metrics available yet for this session.
        </p>
      )}
    </section>
  );
}
