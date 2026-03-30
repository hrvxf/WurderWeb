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
    <section className="mission-control__panel p-3.5 sm:p-4">
      <h2 className="mission-control__display text-lg font-semibold text-[var(--mc-text)]">Game Overview</h2>
      <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="mission-control__label">Game</dt>
          <dd className="mt-1 text-sm font-medium text-[var(--mc-text)]">{overview.gameName || overview.gameCode}</dd>
        </div>
        <div>
          <dt className="mission-control__label">Status</dt>
          <dd className="mt-1 text-sm font-medium capitalize text-[var(--mc-text)]">{overview.status ?? sessionStatus}</dd>
          <p className="mt-1 text-xs text-[var(--mc-text-muted)]">{sessionState}</p>
        </div>
        <div>
          <dt className="mission-control__label">Players</dt>
          <dd className="mt-1 text-sm font-medium text-[var(--mc-text)]">
            {overview.activePlayers.toLocaleString()} active / {overview.totalPlayers.toLocaleString()} total
          </dd>
        </div>
        <div>
          <dt className="mission-control__label">Sessions</dt>
          <dd className="mt-1 text-sm font-medium text-[var(--mc-text)]">{overview.totalSessions.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="mission-control__label">Started</dt>
          <dd className="mt-1 text-sm text-[var(--mc-text)]">{formatDate(overview.startedAt)}</dd>
        </div>
        <div>
          <dt className="mission-control__label">Ended</dt>
          <dd className="mt-1 text-sm text-[var(--mc-text)]">{formatDate(overview.endedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
