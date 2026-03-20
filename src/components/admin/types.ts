export type ManagerGameOverview = {
  gameCode: string;
  gameName: string;
  status: string;
  mode?: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
};

export type ManagerInsight = {
  label: string;
  value: number;
  message?: string | null;
  triggeredBy?: Array<{
    metric: string;
    actual: number;
    expected: number;
    comparator: "<" | ">" | "<=" | ">=" | "=";
  }>;
};

export type ManagerPlayerPerformance = {
  playerId: string;
  displayName: string;
  kills: number | null;
  deaths: number | null;
  kdRatio: number | null;
  accuracyPct: number | null;
  sessionCount: number | null;
};

export type ManagerSessionSummary = {
  totalSessions: number;
  avgSessionLengthSeconds: number | null;
  longestSessionSeconds: number | null;
  lastSessionAt: string | null;
};

export type ManagerAnalyticsDocument = {
  overview: ManagerGameOverview;
  insights: ManagerInsight[];
  playerPerformance: ManagerPlayerPerformance[];
  sessionSummary: ManagerSessionSummary;
  updatedAt: string | null;
};
