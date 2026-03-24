import { deriveSessionStatus } from "@wurder/shared-analytics";

type ManagerGameOverview = {
  gameCode: string;
  gameName?: string;
  status?: string;
  mode?: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
};

type GameOverviewPanelProps = {
  overview: ManagerGameOverview;
};

function formatDate(value: string | null): string {
  if (!value) return "--";

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "--";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(asDate);
}

export default function GameOverviewPanel({ overview }: GameOverviewPanelProps) {
  const sessionStatus = deriveSessionStatus({
    startedAtMs: overview.startedAt ? new Date(overview.startedAt).getTime() : null,
    endedAtMs: overview.endedAt ? new Date(overview.endedAt).getTime() : null,
  });
  const sessionState = sessionStatus === "ended" ? "Ended session" : sessionStatus === "live" ? "Active session" : "Session not started";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Game Overview</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Game</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{overview.gameName || overview.gameCode}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-1 text-sm font-medium capitalize text-slate-900">{overview.status ?? sessionStatus}</p>
          <p className="mt-1 text-xs text-slate-600">{sessionState}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Players</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {overview.activePlayers.toLocaleString()} active / {overview.totalPlayers.toLocaleString()} total
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sessions</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{overview.totalSessions.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Started</p>
          <p className="mt-1 text-sm text-slate-900">{formatDate(overview.startedAt)}</p>
        </div>
        <div className="rounded-md border border-slate-100 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ended</p>
          <p className="mt-1 text-sm text-slate-900">{formatDate(overview.endedAt)}</p>
        </div>
      </div>
    </section>
  );
}
