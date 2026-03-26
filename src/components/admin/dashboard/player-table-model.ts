import type { ManagerPlayerPerformance } from "@/components/admin/types";

export type SortKey =
  | "displayName"
  | "kills"
  | "deaths"
  | "kdRatio"
  | "accuracyRatio"
  | "disputeRateRatio"
  | "sessionCount";

export type SortDirection = "asc" | "desc";

export type DeathsBasisFilter =
  | "all"
  | "confirmed_claims_against_player"
  | "elimination_deaths"
  | "fallback_death_events";

export type PlayerTableState = {
  query: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
  deathsBasisFilter: DeathsBasisFilter;
  activeOnly: boolean;
};

function valueOf(row: ManagerPlayerPerformance, sortKey: SortKey): number | string {
  switch (sortKey) {
    case "displayName":
      return row.displayName.toLowerCase();
    case "kills":
      return row.kills ?? Number.NEGATIVE_INFINITY;
    case "deaths":
      return row.deaths ?? Number.NEGATIVE_INFINITY;
    case "kdRatio":
      return row.kdRatio ?? Number.NEGATIVE_INFINITY;
    case "accuracyRatio":
      return row.accuracyRatio ?? Number.NEGATIVE_INFINITY;
    case "disputeRateRatio":
      return row.disputeRateRatio ?? Number.NEGATIVE_INFINITY;
    case "sessionCount":
      return row.sessionCount ?? Number.NEGATIVE_INFINITY;
  }
}

export function computePlayerTableRows(players: ManagerPlayerPerformance[], state: PlayerTableState): ManagerPlayerPerformance[] {
  const { query, sortKey, sortDirection, deathsBasisFilter, activeOnly } = state;
  const q = query.trim().toLowerCase();

  const base = players.filter((player) => {
    if (q.length > 0) {
      const hay = `${player.displayName} ${player.playerId}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (deathsBasisFilter !== "all" && player.deathsBasis !== deathsBasisFilter) return false;
    if (activeOnly && (player.sessionCount ?? 0) <= 0) return false;
    return true;
  });

  const dir = sortDirection === "asc" ? 1 : -1;
  return [...base].sort((a, b) => {
    const av = valueOf(a, sortKey);
    const bv = valueOf(b, sortKey);
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
    return ((av as number) - (bv as number)) * dir;
  });
}

export function nextSortState(currentKey: SortKey, currentDirection: SortDirection, clickedKey: SortKey): { sortKey: SortKey; sortDirection: SortDirection } {
  if (currentKey === clickedKey) {
    return { sortKey: currentKey, sortDirection: currentDirection === "asc" ? "desc" : "asc" };
  }
  return { sortKey: clickedKey, sortDirection: "desc" };
}
