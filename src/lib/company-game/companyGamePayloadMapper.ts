import { defaultMetrics } from "@/lib/company-game/companyGameDefaults";
import type {
  GameModeValue,
  SetupState,
} from "@/lib/company-game/companyGameOptions";

export type ManagerConfig = {
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
  metricsEnabled: string[];
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  freeRefreshCooldownSeconds: number;
};

export type CreateCompanyGamePayload = {
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

export function toSessionName(orgName: string, input: string): string {
  const trimmed = input.trim();
  if (trimmed) return trimmed;
  const dateLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date());
  const org = orgName.trim() || "Team";
  return `${org} Session ${dateLabel}`;
}

export function buildManagerConfig(setup: SetupState): ManagerConfig {
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
    metricsEnabled: defaultMetrics,
  };
}

export function buildCreateCompanyGamePayload(setup: SetupState): CreateCompanyGamePayload {
  const managerConfig = buildManagerConfig(setup);
  return {
    orgId: setup.orgId,
    orgName: setup.orgName.trim(),
    templateName: toSessionName(setup.orgName, setup.sessionLabel),
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
