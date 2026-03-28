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
    <section className="mission-control__panel p-4 sm:p-5">
      <h2 className="mission-control__display text-lg font-semibold text-[var(--mc-text)]">Game Overview</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="mission-control__panel-alt p-3">
          <p className="mission-control__label">Game</p>
          <p className="mt-1 text-sm font-medium text-[var(--mc-text)]">{overview.gameName || overview.gameCode}</p>
        </div>
        <div className="mission-control__panel-alt p-3">
          <p className="mission-control__label">Status</p>
          <p className="mt-1 text-sm font-medium capitalize text-[var(--mc-text)]">{overview.status ?? sessionStatus}</p>
          <p className="mt-1 text-xs text-[var(--mc-text-muted)]">{sessionState}</p>
        </div>
        <div className="mission-control__panel-alt p-3">
          <p className="mission-control__label">Players</p>
          <p className="mt-1 text-sm font-medium text-[var(--mc-text)]">
            {overview.activePlayers.toLocaleString()} active / {overview.totalPlayers.toLocaleString()} total
          </p>
        </div>
        <div className="mission-control__panel-alt p-3">
          <p className="mission-control__label">Sessions</p>
          <p className="mt-1 text-sm font-medium text-[var(--mc-text)]">{overview.totalSessions.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="mission-control__panel-alt p-3">
          <p className="mission-control__label">Started</p>
          <p className="mt-1 text-sm text-[var(--mc-text)]">{formatDate(overview.startedAt)}</p>
        </div>
        <div className="mission-control__panel-alt p-3">
          <p className="mission-control__label">Ended</p>
          <p className="mt-1 text-sm text-[var(--mc-text)]">{formatDate(overview.endedAt)}</p>
        </div>
      </div>
    </section>
  );
}
