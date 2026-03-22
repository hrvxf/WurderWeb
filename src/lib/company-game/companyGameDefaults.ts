import type { SetupState } from "@/lib/company-game/companyGameOptions";

export const STORAGE_ORG_NAME_KEY = "wurder.business.lastOrgName";
export const STORAGE_ORG_ID_KEY = "wurder.business.lastOrgId";

export const defaultSetup: SetupState = {
  orgName: "",
  orgId: undefined,
  sessionLabel: "",
  gameMode: "guilds",
  length: 60,
  managerParticipation: "host_only",
};

export const defaultMetrics = [
  "successRate",
  "disputeRate",
  "avgResolutionTimeMs",
  "cleanKillRatio",
  "persuasionScore",
  "closingScore",
];
