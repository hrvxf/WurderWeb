export type ManagerGameOverview = {
  gameCode: string;
  gameName: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  totalPlayers: number;
  activePlayers: number;
  totalSessions: number;
};

export type ManagerInsight = {
  label: string;
  value: number;
};

export type ManagerPlayerPerformance = {
  playerId: string;
  displayName: string;
  kills: number;
  deaths: number;
  kdRatio: number;
  accuracyPct: number;
  sessionCount: number;
};

export type ManagerSessionSummary = {
  totalSessions: number;
  avgSessionLengthSeconds: number;
  longestSessionSeconds: number;
  lastSessionAt: string | null;
};

export type ManagerAnalyticsDocument = {
  overview: ManagerGameOverview;
  insights: ManagerInsight[];
  playerPerformance: ManagerPlayerPerformance[];
  sessionSummary: ManagerSessionSummary;
  updatedAt: string | null;
};
