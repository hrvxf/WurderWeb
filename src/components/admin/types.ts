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
  label: string;
  value: number;
  message?: string | null;
  triggeredBy?: ManagerInsightTrigger[];
};

export type ManagerOverview = {
  gameCode: string;
  gameName: string;
  status: string;
  mode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
};

export type ManagerSessionSummary = {
  totalSessions: number;
  avgSessionLengthSeconds: number | null;
  longestSessionSeconds: number | null;
  lastSessionAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type ManagerAnalyticsDocument = {
  dashboard: DashboardResponse;
  overview: ManagerOverview;
  insights: ManagerInsight[];
  playerPerformance: PlayerPerformance[];
  sessionSummary: ManagerSessionSummary;
  updatedAt: string | null;
};

export type ManagerPlayerPerformance = PlayerPerformance;
