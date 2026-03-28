import { useMemo } from "react";

import { normalizeRatioMetric, toNullableNumber } from "@wurder/shared-analytics";
import type { PlayerPerformance } from "@wurder/shared-analytics";

type PlayerPerformanceTableProps = {
  players: PlayerPerformance[];
  mode?: string | null;
};

function formatPercent(value: number | null | undefined): string {
  const normalizedRatio = normalizeRatioMetric(value ?? null);
  if (!Number.isFinite(normalizedRatio ?? Number.NaN)) return "--";
  return `${((normalizedRatio ?? 0) * 100).toFixed(1)}%`;
}

function formatRatio(value: number | null | undefined): string {
  const normalized = toNullableNumber(value ?? null);
  if (!Number.isFinite(normalized ?? Number.NaN)) return "--";
  return (normalized ?? 0).toFixed(2);
}

function formatCount(value: number | null | undefined): string {
  const normalized = toNullableNumber(value ?? null);
  if (!Number.isFinite(normalized ?? Number.NaN)) return "--";
  return (normalized ?? 0).toLocaleString();
}

function isClassicMode(mode: string | null | undefined): boolean {
  return (mode ?? "").trim().toLowerCase() === "classic";
}

export default function PlayerPerformanceTable({ players, mode }: PlayerPerformanceTableProps) {
  const hasDeathsData = players.some((player) => player.deaths != null);
  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          (toNullableNumber(b.kills ?? b.confirmedKills) ?? Number.NEGATIVE_INFINITY) -
            (toNullableNumber(a.kills ?? a.confirmedKills) ?? Number.NEGATIVE_INFINITY) ||
          (toNullableNumber(b.kd) ?? Number.NEGATIVE_INFINITY) - (toNullableNumber(a.kd) ?? Number.NEGATIVE_INFINITY)
      ),
    [players]
  );

  return (
    <section className="mission-control__panel p-4 sm:p-5">
      <h2 className="mission-control__display text-lg font-semibold text-[var(--mc-text)]">Player Performance</h2>
      {isClassicMode(mode) ? (
        <p className="mt-1 text-xs text-[var(--mc-text-muted)]">In classic mode, D represents confirmed claims against the player rather than eliminations.</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--mc-border)] text-sm">
          <thead className="bg-white/4 text-left text-xs uppercase tracking-wide text-[var(--mc-text-muted)]">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Kills</th>
              <th className="px-3 py-2">{hasDeathsData ? "Deaths" : "Deaths (Unavailable)"}</th>
              <th className="px-3 py-2">K/D</th>
              <th className="px-3 py-2">Accuracy</th>
              <th className="px-3 py-2">Dispute Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--mc-border)]">
            {sortedPlayers.length > 0 ? (
              sortedPlayers.map((player, index) => (
                <tr key={player.playerId ?? player.userId ?? `player-row-${index}`} className="text-[var(--mc-text-soft)]">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--mc-text)]">{player.playerName}</td>
                  <td className="px-3 py-2">{formatCount(player.kills ?? player.confirmedKills)}</td>
                  <td className="px-3 py-2">{formatCount(player.deaths)}</td>
                  <td className="px-3 py-2">{formatRatio(player.kd)}</td>
                  <td className="px-3 py-2">{formatPercent(player.accuracy ?? player.successRate)}</td>
                  <td className="px-3 py-2">{formatPercent(player.disputeRate)}</td>
                </tr>
              ))
            ) : (
              <tr className="text-[var(--mc-text-muted)]">
                <td className="px-3 py-3" colSpan={6}>
                  No player performance data has been aggregated for this game yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
