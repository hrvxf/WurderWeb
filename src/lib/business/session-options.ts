export type SetupStep = 1 | 2 | 3;
export type GameModeValue = "classic" | "elimination" | "guilds" | "free_for_all";
export type FreeForAllVariant = "classic" | "survivor";
export type GuildWinCondition = "score" | "last_standing";
export type SessionLength = 30 | 60 | 90;
export type ManagerParticipationValue = "host_only" | "host_player";

export type SetupState = {
  orgName: string;
  orgId?: string;
  sessionLabel: string;
  gameMode: GameModeValue;
  freeForAllVariant: FreeForAllVariant;
  guildWinCondition: GuildWinCondition;
  length: SessionLength;
  managerParticipation: ManagerParticipationValue;
};

export type GameModeOption = {
  value: GameModeValue;
  label: string;
  practicalDescription: string;
  interactionDescription: string;
  businessUseCases: string[];
  analyticsNote: string;
};

const sharedAnalyticsNote = "Different modes surface different behaviours and insights.";

export const gameModeOptions: GameModeOption[] = [
  {
    value: "classic",
    label: "Classic",
    practicalDescription: "Individual play that surfaces confidence, initiative, and communication performance.",
    interactionDescription:
      "People operate independently, making it easier to observe personal communication style and engagement.",
    businessUseCases: [
      "Individual communication confidence",
      "Identifying standout performers",
      "Observing personal initiative and engagement",
    ],
    analyticsNote: sharedAnalyticsNote,
  },
  {
    value: "elimination",
    label: "Elimination",
    practicalDescription: "Individual play that surfaces confidence, initiative, and communication performance.",
    interactionDescription: "Higher-pressure individual mode where players are removed as the session progresses.",
    businessUseCases: [
      "Strategic thinking",
      "Resilience under pressure",
      "Competitive development exercises",
    ],
    analyticsNote: sharedAnalyticsNote,
  },
  {
    value: "guilds",
    label: "Guilds",
    practicalDescription: "Team-based play that highlights collaboration, coordination, and group dynamics.",
    interactionDescription: "People work in teams, communicate continuously, and adjust together throughout the session.",
    businessUseCases: [
      "Team building",
      "Communication within groups",
      "Observing collaboration and group dynamics",
    ],
    analyticsNote: sharedAnalyticsNote,
  },
  {
    value: "free_for_all",
    label: "Free-for-all",
    practicalDescription:
      "Fully individual play where each participant competes alone, with variants for balanced or survival-focused outcomes.",
    interactionDescription:
      "No teams are formed; participants adapt independently based on the selected variant.",
    businessUseCases: [
      "Solo adaptability",
      "Fast individual decision-making",
      "Comparing play styles across variants",
    ],
    analyticsNote: sharedAnalyticsNote,
  },
];

export const freeForAllVariantOptions: Array<{
  value: FreeForAllVariant;
  label: string;
  description: string;
}> = [
  {
    value: "classic",
    label: "Free-for-all / Classic",
    description: "Balanced free-for-all pacing with familiar scoring behaviour.",
  },
  {
    value: "survivor",
    label: "Free-for-all / Survivor",
    description: "Focuses on outlasting opponents with higher elimination pressure.",
  },
];

export const guildWinConditionOptions: Array<{
  value: GuildWinCondition;
  label: string;
  description: string;
}> = [
  {
    value: "score",
    label: "Guilds / Score",
    description: "Guild with the highest score at session end wins.",
  },
  {
    value: "last_standing",
    label: "Guilds / Last standing",
    description: "Last guild with active players remaining wins.",
  },
];

export const lengthOptions: SessionLength[] = [30, 60, 90];

export const managerParticipationOptions: Array<{
  value: ManagerParticipationValue;
  label: string;
  description: string;
}> = [
  {
    value: "host_only",
    label: "Host only",
    description: "You oversee the session and review insights without participating as a player.",
  },
  {
    value: "host_player",
    label: "Host participates as a player",
    description: "You join the session as a player while still hosting.",
  },
];
