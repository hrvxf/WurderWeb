import type { ManagerAnalyticsDocument } from "@/components/admin/types";
import {
  buildClaimsFunnelSeries,
  buildDeathsBasisSeries,
  buildInsightBarSeries,
  buildOverviewSnapshot,
  buildPlayerScatterSeries,
  type ChartBarDatum,
} from "@/components/admin/dashboard/chart-adapters";
import BarChart from "@/components/admin/dashboard/charts/BarChart";
import ScatterChart from "@/components/admin/dashboard/charts/ScatterChart";

type ChartReadyPanelProps = {
  analytics: ManagerAnalyticsDocument;
  onSelectPlayerById?: (playerId: string) => void;
};

function formatValue(value: number, unit: ChartBarDatum["unit"]): string {
  if (unit === "ratio") return `${(value * 100).toFixed(1)}%`;
  if (unit === "ms") return `${Math.round(value).toLocaleString()} ms`;
  return value.toLocaleString();
}

function SeriesCard({ title, data }: { title: string; data: ChartBarDatum[] }) {
  return (
    <article className="surface-panel-muted p-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-2 text-xs text-white/60">No chart data yet.</p>
      ) : (
        <div className="mt-2">
          <BarChart data={data.map((item) => ({ ...item, valueLabel: formatValue(item.value, item.unit) }))} />
        </div>
      )}
    </article>
  );
}

export default function ChartReadyPanel({ analytics, onSelectPlayerById }: ChartReadyPanelProps) {
  const overviewBars = buildOverviewSnapshot(analytics.overview);
  const insightBars = buildInsightBarSeries(analytics.insights, 6);
  const claimsBars = buildClaimsFunnelSeries(analytics.sessionSummary);
  const deathsBasisBars = buildDeathsBasisSeries(analytics.playerPerformance);
  const scatter = buildPlayerScatterSeries(analytics.playerPerformance);

  return (
    <section className="surface-panel p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Visual Analytics</h2>
        <span className="text-xs text-white/55">chart-ready adapters</span>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <SeriesCard title="Overview Snapshot" data={overviewBars} />
        <SeriesCard title="Top Insight Signals" data={insightBars} />
        <SeriesCard title="Claims Funnel" data={claimsBars} />
        <SeriesCard title="Deaths Basis Distribution" data={deathsBasisBars} />
      </div>
      <div className="surface-panel-muted mt-3 p-3">
        <p className="text-sm font-semibold text-white">Player Scatter Dataset</p>
        <p className="mt-1 text-xs text-white/65">
          {scatter.length} points (x = accuracy ratio, y = K/D ratio, size = kills). Click a point for player drill-down.
        </p>
        <div className="mt-2">
          <ScatterChart data={scatter} onPointClick={onSelectPlayerById} />
        </div>
      </div>
    </section>
  );
}
