import { useMemo } from "react";

import type { ManagerPlayerPerformance } from "@/components/admin/types";

type PlayerPerformanceTableProps = {
  players: ManagerPlayerPerformance[];
};

function formatPercent(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return `${(value ?? 0).toFixed(1)}%`;
}

function formatRatio(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return (value ?? 0).toFixed(2);
}

function formatCount(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return (value ?? 0).toLocaleString();
}

export default function PlayerPerformanceTable({ players }: PlayerPerformanceTableProps) {
  const hasDeathsData = players.some((player) => player.deaths != null);
  const hasKdData = players.some((player) => player.kdRatio != null);
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
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Kills</th>
              <th className="px-3 py-2">{hasDeathsData ? "Deaths" : "Deaths (Unavailable)"}</th>
              <th className="px-3 py-2">{hasKdData ? "K/D" : "K/D (Unavailable)"}</th>
              <th className="px-3 py-2">Accuracy</th>
              <th className="px-3 py-2">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPlayers.length > 0 ? (
              sortedPlayers.map((player) => (
                <tr key={player.playerId} className="text-slate-700">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{player.displayName}</td>
                  <td className="px-3 py-2">{formatCount(player.kills)}</td>
                  <td className="px-3 py-2">{formatCount(player.deaths)}</td>
                  <td className="px-3 py-2">{formatRatio(player.kdRatio)}</td>
                  <td className="px-3 py-2">{formatPercent(player.accuracyPct)}</td>
                  <td className="px-3 py-2">{formatCount(player.sessionCount)}</td>
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
