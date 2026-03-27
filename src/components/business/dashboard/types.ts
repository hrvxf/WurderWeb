import type { DashboardResponse, PlayerPerformance } from "@wurder/shared-analytics";

export type AnalyticsAccessState = {
  visibility: "limited_live" | "full_post_session";
  allowedSections: {
    overview: boolean;
    insights: boolean;
    playerComparison: boolean;
    sessionSummary: boolean;
    exports: boolean;
  };
  message: string | null;
};

export type ManagerBranding = {
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
};

export type ManagerInsightTrigger = {
  metric: string;
  actual: number;
  expected: number;
  comparator: "<" | ">" | "<=" | ">=" | "=";
};

export type ManagerInsight = {
  id: string;
  label: string;
  value: number;
  unit: "count" | "ratio" | "ms";
  severity: "info" | "warning" | "critical";
  message: string;
  evidence?: ManagerInsightTrigger[];
  triggeredBy?: ManagerInsightTrigger[];
};

export type ManagerOverview = {
  gameCode: string;
  gameName: string;
  status: string;
  lifecycleStatus: "not_started" | "in_progress" | "completed";
  mode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
  totalEvents: number;
  metricSemantics: {
    deaths: {
      modeBasis:
        | "confirmed_claims_against_player"
        | "elimination_deaths"
        | "fallback_death_events";
    };
  };
};

export type ManagerGameOverview = ManagerOverview;

export type ManagerSessionSummary = {
  totalSessions: number;
  avgSessionLengthSeconds: number | null;
  longestSessionSeconds: number | null;
  lastSessionAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  avgSessionDurationMs: number | null;
  longestSessionDurationMs: number | null;
  totalClaimsSubmitted: number;
  totalClaimsDenied: number;
};

export type ManagerPlayerPerformance = PlayerPerformance & {
  playerId: string;
  displayName: string;
  avatarUrl?: string | null;
  kdRatio: number | null;
  accuracyRatio: number | null;
  disputeRateRatio: number | null;
  sessionCount: number | null;
  claimsSubmitted: number | null;
  claimsConfirmed: number | null;
  claimsDenied: number | null;
  deathsBasis:
    | "confirmed_claims_against_player"
    | "elimination_deaths"
    | "fallback_death_events";
};

export type ManagerRecommendation = {
  id: string;
  title: string;
  reason: string;
  action: string;
  category?: "risk" | "performance" | "operations";
  priority?: "low" | "medium" | "high";
  basedOn?: string[];
};

export type ManagerTimelineEntry = {
  id: string;
  occurredAt: string | null;
  label: string;
  type?: string;
};

export type ManagerAnalyticsDocument = {
  dashboard: DashboardResponse;
  overview: ManagerOverview;
  insights: ManagerInsight[];
  playerPerformance: ManagerPlayerPerformance[];
  sessionSummary: ManagerSessionSummary;
  recommendations?: ManagerRecommendation[];
  timeline?: ManagerTimelineEntry[];
  updatedAt: string | null;
};
