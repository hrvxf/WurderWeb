import { computeAccuracy, computeKd, deriveSessionStatus, toNullableNumber } from "@wurder/shared-analytics";

export type AnalyticsVisibility = "limited_live" | "full_post_session";

export type AnalyticsAllowedSections = {
  overview: boolean;
  insights: boolean;
  playerComparison: boolean;
  sessionSummary: boolean;
  exports: boolean;
};

export type AnalyticsAccess = {
  visibility: AnalyticsVisibility;
  allowedSections: AnalyticsAllowedSections;
  message: string | null;
};

export type ManagerPlayerAggregate = {
  playerId: string;
  displayName: string;
  kills: number | null;
  deaths: number | null;
  kdRatio: number | null;
  accuracyPct: number | null;
  sessionCount: number | null;
};

type PlayerAnalyticsLike = {
  playerId?: unknown;
  userId?: unknown;
  displayName?: unknown;
  eventsTotal?: unknown;
  eventCounts?: unknown;
  kills?: unknown;
  deaths?: unknown;
  deathCount?: unknown;
  deniedCount?: unknown;
  disputeCount?: unknown;
  claimCount?: unknown;
  claimsCount?: unknown;
  totalClaims?: unknown;
  confirmedCount?: unknown;
  convertedClaimCount?: unknown;
  convertedCount?: unknown;
  confirmedAgainst?: unknown;
  confirmedAgainstCount?: unknown;
  claimsAgainstConfirmed?: unknown;
  claimsConfirmedAgainst?: unknown;
  eliminationDeaths?: unknown;
  eliminationDeathCount?: unknown;
  successRate?: unknown;
  accuracy?: unknown;
  accuracyPct?: unknown;
  sessions?: unknown;
  sessionCount?: unknown;
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function pickFirstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

export function eventLabel(eventType: string): string {
  const normalized = eventType.trim().toLowerCase();
  const labelMap: Record<string, string> = {
    game_started: "Game Started",
    game_ended: "Game Ended",
    admin_confirm_kill_claim: "Admin Confirm Kill Claim",
    admin_deny_kill_claim: "Admin Deny Kill Claim",
  };
  if (labelMap[normalized]) return labelMap[normalized];
  return normalized
    .split("_")
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function deriveLifecycleStatus(input: {
  started?: boolean | null;
  ended?: boolean | null;
  startedAtMs?: number | null;
  endedAtMs?: number | null;
}): "not_started" | "in_progress" | "completed" {
  const status = deriveSessionStatus(input);
  if (status === "ended") return "completed";
  if (status === "live") return "in_progress";
  return "not_started";
}

export function normalizePlayerAggregate(input: {
  row: PlayerAnalyticsLike;
  fallbackPlayerId: string;
  normalizedMode: string;
}): ManagerPlayerAggregate {
  const { row, fallbackPlayerId, normalizedMode } = input;
  const eventCounts = row.eventCounts && typeof row.eventCounts === "object" ? (row.eventCounts as Record<string, unknown>) : {};
  const confirmedCount = pickFirstNumber(
    row.confirmedCount,
    row.convertedClaimCount,
    row.convertedCount,
    eventCounts.admin_confirm_kill_claim,
    eventCounts.kill_claim_confirmed
  );
  const claimCount = pickFirstNumber(
    row.claimCount,
    row.claimsCount,
    row.totalClaims,
    eventCounts.kill_claim,
    eventCounts.kill_claim_submitted,
    eventCounts.admin_confirm_kill_claim
  );
  const kills = pickFirstNumber(row.kills, confirmedCount);
  const eliminationDeaths = pickFirstNumber(
    row.eliminationDeaths,
    row.eliminationDeathCount,
    row.deaths,
    row.deathCount,
    eventCounts.elimination_death,
    eventCounts.eliminated,
    eventCounts.death
  );
  const confirmedAgainst = pickFirstNumber(
    row.confirmedAgainst,
    row.confirmedAgainstCount,
    row.claimsAgainstConfirmed,
    row.claimsConfirmedAgainst,
    eventCounts.confirmed_against,
    eventCounts.admin_confirm_kill_claim_against,
    eventCounts.kill_claim_confirmed_against,
    eventCounts.victim_confirmed_claim
  );
  const successRate = pickFirstNumber(row.successRate, row.accuracy, row.accuracyPct);
  const kdDenominator =
    normalizedMode === "classic"
      ? confirmedAgainst
      : normalizedMode === "elimination"
        ? eliminationDeaths
        : pickFirstNumber(eliminationDeaths, confirmedAgainst);
  const computedAccuracy = confirmedCount != null && claimCount != null ? computeAccuracy(confirmedCount, claimCount) : null;
  const derivedAccuracyPct = computedAccuracy != null ? computedAccuracy * 100 : null;

  return {
    playerId: asString(row.playerId) ?? asString(row.userId) ?? fallbackPlayerId,
    displayName: asString(row.displayName) ?? asString(row.playerId) ?? asString(row.userId) ?? fallbackPlayerId,
    kills,
    deaths: kdDenominator,
    kdRatio: kills != null ? computeKd(kills, toNullableNumber(kdDenominator) ?? 0) : null,
    accuracyPct: successRate ?? derivedAccuracyPct,
    sessionCount: pickFirstNumber(row.sessionCount, row.sessions, row.eventsTotal != null || claimCount != null ? 1 : null),
  };
}
