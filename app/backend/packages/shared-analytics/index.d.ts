export type SessionStatus = "not_started" | "in_progress" | "completed" | "unknown";

export type DashboardOverview = {
  gameCode: string;
  gameName: string;
  status: SessionStatus | string;
  mode?: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
};

export type InsightTrigger = {
  metric: string;
  actual: number;
  expected: number;
  comparator: "<" | ">" | "<=" | ">=" | "=";
};

export type DashboardInsight = {
  label: string;
  value: number;
  message?: string | null;
  triggeredBy?: InsightTrigger[];
};

export type PlayerPerformance = {
  playerId: string;
  displayName: string;
  kills: number | null;
  deaths: number | null;
  kdRatio: number | null;
  accuracyPct: number | null;
  sessionCount: number | null;
};

export type DashboardSessionSummary = {
  totalSessions: number;
  avgSessionLengthSeconds: number | null;
  longestSessionSeconds: number | null;
  lastSessionAt: string | null;
};

export type DashboardResponse = {
  overview: DashboardOverview;
  insights: DashboardInsight[];
  playerPerformance: PlayerPerformance[];
  sessionSummary: DashboardSessionSummary;
  updatedAt: string | null;
};

export declare function deriveSessionStatus(input: {
  status?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  started?: unknown;
  ended?: unknown;
}): SessionStatus;

export declare function displaySafeCount(value: number | null | undefined, fallback?: string): string;
export declare function displaySafePercent(value: number | null | undefined, fallback?: string, fractionDigits?: number): string;
export declare function displaySafeRatio(value: number | null | undefined, fallback?: string, fractionDigits?: number): string;
export declare function displaySafeDurationSeconds(value: number | null | undefined, fallback?: string): string;
