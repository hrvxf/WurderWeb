import type { ManagerGameOverview, ManagerSessionSummary } from "@/components/admin/types";

type OverviewCardsProps = {
  overview: ManagerGameOverview;
  summary: ManagerSessionSummary;
};

function formatDurationMs(durationMs: number | null): string {
  if (!Number.isFinite(durationMs ?? NaN) || (durationMs ?? 0) <= 0) return "--";
  const totalSeconds = Math.floor((durationMs ?? 0) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function Card({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="surface-panel-muted p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-1 text-xs text-white/60">{detail}</p> : null}
    </article>
  );
}

export default function OverviewCards({ overview, summary }: OverviewCardsProps) {
  return (
    <section className="surface-panel p-4 sm:p-5">
      <h2 className="text-base font-semibold text-white">Overview</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Players"
          value={`${overview.activePlayers.toLocaleString()} / ${overview.totalPlayers.toLocaleString()}`}
          detail="active / total"
        />
        <Card label="Sessions" value={overview.totalSessions.toLocaleString()} />
        <Card label="Events" value={overview.totalEvents.toLocaleString()} />
        <Card label="Duration" value={formatDurationMs(summary.durationMs)} detail="latest session" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
          Accuracy: ratio 0-1
        </span>
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
          Dispute rate: ratio 0-1
        </span>
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
          Death basis: {overview.metricSemantics.deaths.modeBasis.replace(/_/g, " ")}
        </span>
      </div>
    </section>
  );
}
