import { useMemo } from "react";

import {
  displaySafeCount,
  displaySafePercent,
  displaySafeRatio,
  type PlayerPerformance,
} from "@wurder/shared-analytics";

type PlayerPerformanceTableProps = {
  players: PlayerPerformance[];
  mode?: string | null;
};

function isClassicMode(mode: string | null | undefined): boolean {
  return (mode ?? "").trim().toLowerCase() === "classic";
}

export default function PlayerPerformanceTable({ players, mode }: PlayerPerformanceTableProps) {
  const hasDeathsData = players.some((player) => player.deaths != null);
  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          (b.kills ?? Number.NEGATIVE_INFINITY) - (a.kills ?? Number.NEGATIVE_INFINITY) ||
          (b.kdRatio ?? Number.NEGATIVE_INFINITY) - (a.kdRatio ?? Number.NEGATIVE_INFINITY)
      ),
    [players]
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Player Performance</h2>
      {isClassicMode(mode) ? (
        <p className="mt-1 text-xs text-slate-500">In classic mode, D represents confirmed claims against the player rather than eliminations.</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Kills</th>
              <th className="px-3 py-2">{hasDeathsData ? "Deaths" : "Deaths (Unavailable)"}</th>
              <th className="px-3 py-2">K/D</th>
              <th className="px-3 py-2">Accuracy</th>
              <th className="px-3 py-2">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPlayers.length > 0 ? (
              sortedPlayers.map((player) => (
                <tr key={player.playerId} className="text-slate-700">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{player.displayName}</td>
                  <td className="px-3 py-2">{displaySafeCount(player.kills)}</td>
                  <td className="px-3 py-2">{displaySafeCount(player.deaths)}</td>
                  <td className="px-3 py-2">{displaySafeRatio(player.kdRatio)}</td>
                  <td className="px-3 py-2">{displaySafePercent(player.accuracyPct)}</td>
                  <td className="px-3 py-2">{displaySafeCount(player.sessionCount)}</td>
                </tr>
              ))
            ) : (
              <tr className="text-slate-500">
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
