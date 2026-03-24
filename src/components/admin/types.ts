import type { DashboardResponse, PlayerPerformance } from "@wurder/shared-analytics";

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

export type ManagerAnalyticsDocument = DashboardResponse;

export type ManagerPlayerPerformance = PlayerPerformance;
