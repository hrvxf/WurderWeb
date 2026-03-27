import { useEffect, useMemo, useState } from "react";

import type { ManagerPlayerPerformance } from "@/components/admin/types";
import {
  computePlayerTableRows,
  nextSortState,
  type DeathsBasisFilter,
  type SortKey,
} from "@/components/admin/dashboard/player-table-model";
import type { DashboardDensity } from "@/components/admin/dashboard/view-mode";

type PlayerPerformanceSectionProps = {
  players: ManagerPlayerPerformance[];
  mode?: string | null;
  density: DashboardDensity;
  onDensityChange: (next: DashboardDensity) => void;
  onSelectPlayer: (player: ManagerPlayerPerformance) => void;
};

function formatCount(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return (value ?? 0).toLocaleString();
}

function formatRatio(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return (value ?? 0).toFixed(2);
}

function formatPercentFromRatio(value: number | null): string {
  if (!Number.isFinite(value ?? NaN)) return "--";
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

function isClassicMode(mode: string | null | undefined): boolean {
  return (mode ?? "").trim().toLowerCase() === "classic";
}

function initialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0]?.toUpperCase() ?? "?";
}

function PlayerAvatar({ player }: { player: ManagerPlayerPerformance }) {
  if (player.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.avatarUrl} alt={`${player.displayName} avatar`} className="h-7 w-7 rounded-full border border-white/20 object-cover" />;
  }

  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold text-white/85">
      {initialFromName(player.displayName)}
    </span>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button type="button" className="inline-flex items-center gap-1 hover:text-white" onClick={onClick}>
      {label}
      {active ? <span>{direction === "asc" ? "^" : "v"}</span> : null}
    </button>
  );
}

export default function PlayerPerformanceSection({
  players,
  mode,
  density,
  onDensityChange,
  onSelectPlayer,
}: PlayerPerformanceSectionProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("kills");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deathsBasisFilter, setDeathsBasisFilter] = useState<DeathsBasisFilter>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [renderCount, setRenderCount] = useState(120);

  const hasDeathsData = players.some((player) => player.deaths != null);

  const filtered = useMemo(
    () =>
      computePlayerTableRows(players, {
        query,
        sortKey,
        sortDirection,
        deathsBasisFilter,
        activeOnly,
      }),
    [activeOnly, deathsBasisFilter, players, query, sortDirection, sortKey]
  );
  const visiblePlayers = useMemo(() => filtered.slice(0, renderCount), [filtered, renderCount]);

  useEffect(() => {
    setRenderCount(120);
  }, [query, deathsBasisFilter, activeOnly, sortKey, sortDirection]);

  const onSort = (key: SortKey) => {
    const next = nextSortState(sortKey, sortDirection, key);
    setSortKey(next.sortKey);
    setSortDirection(next.sortDirection);
    setRenderCount(120);
  };

  return (
    <section className="surface-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Player Performance</h2>
          {isClassicMode(mode) ? (
            <p className="mt-1 text-xs text-white/65">In classic mode, D represents confirmed claims against the player rather than eliminations.</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="input-dark w-full py-2 text-sm placeholder:text-white/45"
            placeholder="Search player"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="input-dark py-2 text-sm"
            value={deathsBasisFilter}
            onChange={(event) => setDeathsBasisFilter(event.target.value as DeathsBasisFilter)}
          >
            <option value="all">All Death Bases</option>
            <option value="confirmed_claims_against_player">Claims Against</option>
            <option value="elimination_deaths">Elimination Deaths</option>
            <option value="fallback_death_events">Fallback Events</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
            Active Only
          </label>
          <div className="surface-panel-muted inline-flex p-0.5">
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                density === "comfortable" ? "bg-[var(--manager-accent)] text-white" : "text-white/70 hover:bg-white/[0.08]"
              }`}
              onClick={() => onDensityChange("comfortable")}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                density === "compact" ? "bg-[var(--manager-accent)] text-white" : "text-white/70 hover:bg-white/[0.08]"
              }`}
              onClick={() => onDensityChange("compact")}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <div
          className="surface-panel-muted scroll-chrome max-h-[32rem] overflow-auto"
          onScroll={(event) => {
            const target = event.currentTarget;
            const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 240;
            if (!nearBottom) return;
            setRenderCount((current) => Math.min(filtered.length, current + 120));
          }}
        >
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/[0.06] text-left text-xs uppercase tracking-[0.14em] text-white/60">
              <tr>
                <th className="sticky top-0 z-10 bg-[#171c29] px-3 py-2">
                  <SortHeader label="Player" active={sortKey === "displayName"} direction={sortDirection} onClick={() => onSort("displayName")} />
                </th>
                <th className="sticky top-0 z-10 bg-[#171c29] px-3 py-2">
                  <SortHeader label="Kills" active={sortKey === "kills"} direction={sortDirection} onClick={() => onSort("kills")} />
                </th>
                <th className="sticky top-0 z-10 bg-[#171c29] px-3 py-2">
                  <SortHeader label={hasDeathsData ? "Deaths" : "Deaths (Unavailable)"} active={sortKey === "deaths"} direction={sortDirection} onClick={() => onSort("deaths")} />
                </th>
                <th className="sticky top-0 z-10 bg-[#171c29] px-3 py-2">
                  <SortHeader label="K/D" active={sortKey === "kdRatio"} direction={sortDirection} onClick={() => onSort("kdRatio")} />
                </th>
                <th className="sticky top-0 z-10 bg-[#171c29] px-3 py-2">
                  <SortHeader label="Accuracy" active={sortKey === "accuracyRatio"} direction={sortDirection} onClick={() => onSort("accuracyRatio")} />
                </th>
                <th className="sticky top-0 z-10 bg-[#171c29] px-3 py-2">
                  <SortHeader label="Dispute Rate" active={sortKey === "disputeRateRatio"} direction={sortDirection} onClick={() => onSort("disputeRateRatio")} />
                </th>
                <th className="sticky top-0 z-10 bg-[#171c29] px-3 py-2">
                  <SortHeader label="Sessions" active={sortKey === "sessionCount"} direction={sortDirection} onClick={() => onSort("sessionCount")} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-black/20">
              {filtered.length > 0 ? (
                visiblePlayers.map((player) => (
                <tr
                  key={player.playerId}
                  className="cursor-pointer text-white/85 hover:bg-white/[0.06]"
                  onClick={() => onSelectPlayer(player)}
                >
                  <td className={`whitespace-nowrap px-3 ${density === "compact" ? "py-1.5" : "py-2.5"} font-medium text-white`}>
                    <div className="flex items-center gap-2">
                      <PlayerAvatar player={player} />
                      <span>{player.displayName}</span>
                    </div>
                  </td>
                    <td className={`px-3 ${density === "compact" ? "py-1.5" : "py-2.5"}`}>{formatCount(player.kills)}</td>
                    <td className={`px-3 ${density === "compact" ? "py-1.5" : "py-2.5"}`}>{formatCount(player.deaths)}</td>
                    <td className={`px-3 ${density === "compact" ? "py-1.5" : "py-2.5"}`}>{formatRatio(player.kdRatio)}</td>
                    <td className={`px-3 ${density === "compact" ? "py-1.5" : "py-2.5"}`}>{formatPercentFromRatio(player.accuracyRatio)}</td>
                    <td className={`px-3 ${density === "compact" ? "py-1.5" : "py-2.5"}`}>{formatPercentFromRatio(player.disputeRateRatio)}</td>
                    <td className={`px-3 ${density === "compact" ? "py-1.5" : "py-2.5"}`}>{formatCount(player.sessionCount)}</td>
                  </tr>
                ))
              ) : (
                <tr className="text-white/60">
                  <td className="px-3 py-3" colSpan={7}>
                    No player rows match your search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visiblePlayers.length < filtered.length ? (
          <p className="mt-2 text-xs text-white/55">Showing {visiblePlayers.length} of {filtered.length} players. Scroll to load more.</p>
        ) : null}
        <div className="pointer-events-none absolute inset-x-1 top-1 h-5 rounded-t-lg bg-gradient-to-b from-[#111624] to-transparent" />
        <div className="pointer-events-none absolute inset-x-1 bottom-1 h-5 rounded-b-lg bg-gradient-to-t from-[#111624] to-transparent" />
      </div>
    </section>
  );
}
