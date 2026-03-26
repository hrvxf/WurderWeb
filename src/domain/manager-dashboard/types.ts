export type MetricUnit = "count" | "ratio" | "ms";

export type ManagerDashboardPayload = {
  schemaVersion: "manager_dashboard.v1";
  overview: ManagerDashboardOverview;
  insights: ManagerDashboardInsight[];
  playerPerformance: ManagerPlayerPerformance[];
  sessionSummary: ManagerSessionSummary;
  recommendations: ManagerRecommendation[];
  updatedAt: string | null;
  timeline?: ManagerTimelineEvent[];
};

export type ManagerKpiThresholds = {
  disputeRateWarningRatio: number;
  disputeRateLabel?: string | null;
};

export type ManagerDashboardOverview = {
  gameCode: string;
  gameName: string;
  lifecycleStatus: "not_started" | "in_progress" | "completed";
  mode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
  totalEvents: number;
  metricSemantics: {
    accuracy: { unit: "ratio_0_to_1"; basis: "confirmed_claims_over_submitted_claims" };
    disputeRate: { unit: "ratio_0_to_1"; basis: "denied_claims_over_submitted_claims" };
    kd: { unit: "ratio"; basis: "kills_over_deaths" };
    deaths: {
      unit: "count";
      modeBasis:
        | "confirmed_claims_against_player"
        | "elimination_deaths"
        | "fallback_death_events";
    };
  };
};

export type InsightEvidence = {
  metric: string;
  actual: number;
  expected: number;
  comparator: "<" | "<=" | ">" | ">=" | "=";
};

export type ManagerDashboardInsight = {
  id: string;
  label: string;
  value: number | null;
  unit: MetricUnit;
  severity: "info" | "warning" | "critical";
  message: string;
  evidence?: InsightEvidence[];
};

export type DeathsBasis =
  | "confirmed_claims_against_player"
  | "elimination_deaths"
  | "fallback_death_events";

export type ManagerPlayerPerformance = {
  playerId: string;
  displayName: string;
  avatarUrl?: string;
  kills: number | null;
  deaths: number | null;
  deathsBasis: DeathsBasis;
  kdRatio: number | null;
  claimsSubmitted: number | null;
  claimsConfirmed: number | null;
  claimsDenied: number | null;
  accuracyRatio: number | null;
  disputeRateRatio: number | null;
  sessionCount: number | null;
};

export type SummaryPlayerHighlight = {
  playerId: string;
  displayName: string;
  avatarUrl?: string;
  kills: number | null;
  deaths: number | null;
  kdRatio: number | null;
  accuracyRatio: number | null;
};

export type TeamComparisonMetric = {
  label: string;
  value: number;
};

export type ManagerSessionSummary = {
  totalSessions: number;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  avgSessionDurationMs: number | null;
  longestSessionDurationMs: number | null;
  lastSessionAt: string | null;
  totalKills: number;
  totalDeaths: number;
  totalClaimsSubmitted: number;
  totalClaimsDenied: number;
  topPerformer: SummaryPlayerHighlight | null;
  coachingRisk: SummaryPlayerHighlight | null;
  teamMode: boolean;
  teamComparison: TeamComparisonMetric[];
};

export type ManagerRecommendation = {
  id: string;
  category: "risk" | "performance" | "operations";
  priority: "low" | "medium" | "high";
  title: string;
  reason: string;
  action: string;
  basedOn: string[];
};

export type ManagerTimelineEvent = {
  id: string;
  occurredAt: string | null;
  type: string;
  label: string;
  actorId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type BuildPayloadInput = {
  gameCode: string;
  game: {
    name?: unknown;
    mode?: unknown;
    startedAt?: unknown;
    endedAt?: unknown;
    started?: unknown;
    ended?: unknown;
  };
  playerAnalyticsDocs: Array<{ id: string; data: Record<string, unknown> }>;
  analyticsEvents: Array<{ id: string; data: Record<string, unknown> }>;
  includeTimeline?: boolean;
  thresholds?: Partial<ManagerKpiThresholds>;
};
