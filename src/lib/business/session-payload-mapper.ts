import { defaultBusinessMetrics } from "@/lib/business/session-defaults";
import type {
  GameModeValue,
  SetupState,
} from "@/lib/business/session-options";

export type BusinessSessionManagerConfig = {
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
  metricsEnabled: string[];
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  freeRefreshCooldownSeconds: number;
};

export type CreateBusinessSessionPayload = {
  orgId?: string;
  orgName: string;
  templateName: string;
  saveTemplate: false;
  managerParticipation: "host_only" | "host_player";
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
  metricsEnabled: string[];
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  maxActiveClaimsPerPlayer: 1;
  freeRefreshCooldownSeconds: number;
};

export function toBusinessSessionName(orgName: string, input: string): string {
  const trimmed = input.trim();
  if (trimmed) return trimmed;
  const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date());
  const org = orgName.trim() || "Team";
  return `${org} Session ${dateLabel}`;
}

export function buildBusinessSessionManagerConfig(setup: SetupState): BusinessSessionManagerConfig {
  const modeMapping: Record<
    GameModeValue,
    {
      mode: string;
      teamsEnabled: boolean;
      wordDifficulty: string;
      minSecondsBeforeClaim: number;
      minSecondsBetweenClaims: number;
      freeRefreshCooldownSeconds: number;
    }
  > = {
    guilds: {
      mode: "guild",
      teamsEnabled: true,
      wordDifficulty: "medium",
      minSecondsBeforeClaim: 5,
      minSecondsBetweenClaims: 10,
      freeRefreshCooldownSeconds: 12,
    },
    classic: {
      mode: "classic",
      teamsEnabled: false,
      wordDifficulty: "medium",
      minSecondsBeforeClaim: 5,
      minSecondsBetweenClaims: 10,
      freeRefreshCooldownSeconds: 12,
    },
    elimination: {
      mode: "ring",
      teamsEnabled: false,
      wordDifficulty: "hard",
      minSecondsBeforeClaim: 0,
      minSecondsBetweenClaims: 0,
      freeRefreshCooldownSeconds: 0,
    },
  };

  const modeConfig = modeMapping[setup.gameMode];

  return {
    mode: modeConfig.mode,
    teamsEnabled: modeConfig.teamsEnabled,
    durationMinutes: setup.length,
    wordDifficulty: modeConfig.wordDifficulty,
    minSecondsBeforeClaim: modeConfig.minSecondsBeforeClaim,
    minSecondsBetweenClaims: modeConfig.minSecondsBetweenClaims,
    freeRefreshCooldownSeconds: modeConfig.freeRefreshCooldownSeconds,
    metricsEnabled: defaultBusinessMetrics,
  };
}

export function buildCreateBusinessSessionPayload(setup: SetupState): CreateBusinessSessionPayload {
  const managerConfig = buildBusinessSessionManagerConfig(setup);
  return {
    orgId: setup.orgId,
    orgName: setup.orgName.trim(),
    templateName: toBusinessSessionName(setup.orgName, setup.sessionLabel),
    saveTemplate: false,
    managerParticipation: setup.managerParticipation,
    mode: managerConfig.mode,
    durationMinutes: managerConfig.durationMinutes,
    wordDifficulty: managerConfig.wordDifficulty,
    teamsEnabled: managerConfig.teamsEnabled,
    metricsEnabled: managerConfig.metricsEnabled,
    minSecondsBeforeClaim: managerConfig.minSecondsBeforeClaim,
    minSecondsBetweenClaims: managerConfig.minSecondsBetweenClaims,
    maxActiveClaimsPerPlayer: 1,
    freeRefreshCooldownSeconds: managerConfig.freeRefreshCooldownSeconds,
  };
}

// Transitional aliases kept during migration window.
export type ManagerConfig = BusinessSessionManagerConfig;
export type CreateCompanyGamePayload = CreateBusinessSessionPayload;
export const toSessionName = toBusinessSessionName;
export const buildManagerConfig = buildBusinessSessionManagerConfig;
export const buildCreateCompanyGamePayload = buildCreateBusinessSessionPayload;

