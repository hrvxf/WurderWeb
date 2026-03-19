import type { ManagerSessionSummary } from "@/admin/types";

type SessionSummaryProps = {
  summary: ManagerSessionSummary;
};

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(asDate);
}

export default function SessionSummary({ summary }: SessionSummaryProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Session Summary</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total Sessions</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{summary.totalSessions.toLocaleString()}</p>
        </article>
        <article className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Avg Length</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatDuration(summary.avgSessionLengthSeconds)}</p>
        </article>
        <article className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Longest Session</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatDuration(summary.longestSessionSeconds)}</p>
        </article>
        <article className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Last Session</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{formatDate(summary.lastSessionAt)}</p>
        </article>
      </div>
    </section>
  );
}
