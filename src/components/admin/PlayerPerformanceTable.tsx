import { useMemo } from "react";

import type { ManagerPlayerPerformance } from "@/components/admin/types";

type PlayerPerformanceTableProps = {
  players: ManagerPlayerPerformance[];
};

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

export default function PlayerPerformanceTable({ players }: PlayerPerformanceTableProps) {
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.kills - a.kills || b.kdRatio - a.kdRatio),
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
              <th className="px-3 py-2">Deaths</th>
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
                  <td className="px-3 py-2">{player.kills.toLocaleString()}</td>
                  <td className="px-3 py-2">{player.deaths.toLocaleString()}</td>
                  <td className="px-3 py-2">{formatRatio(player.kdRatio)}</td>
                  <td className="px-3 py-2">{formatPercent(player.accuracyPct)}</td>
                  <td className="px-3 py-2">{player.sessionCount.toLocaleString()}</td>
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
