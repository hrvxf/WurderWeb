import type { SetupState } from "@/lib/business/session-options";

export const BUSINESS_STORAGE_ORG_NAME_KEY = "wurder.business.lastOrgName";
export const BUSINESS_STORAGE_ORG_ID_KEY = "wurder.business.lastOrgId";

export const defaultBusinessSetup: SetupState = {
  orgName: "",
  orgId: undefined,
  sessionLabel: "",
  gameMode: "guilds",
  length: 60,
  managerParticipation: "host_only",
};

export const defaultBusinessMetrics = [
  "successRate",
  "disputeRate",
  "avgResolutionTimeMs",
  "cleanKillRatio",
  "persuasionScore",
  "closingScore",
];

