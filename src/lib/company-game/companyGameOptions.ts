export type SetupStep = 1 | 2 | 3;
export type GameModeValue = "guilds" | "classic" | "elimination";
export type SessionLength = 30 | 60 | 90;
export type ManagerParticipationValue = "host_only" | "host_player";

export type SetupState = {
  orgName: string;
  orgId?: string;
  sessionLabel: string;
  gameMode: GameModeValue;
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
    practicalDescription:
      "Strategic play that raises the stakes and highlights adaptability, resilience, and decision-making under pressure.",
    interactionDescription:
      "As participants are removed over time, remaining players need to adapt quickly and make stronger decisions.",
    businessUseCases: [
      "Strategic thinking",
      "Resilience under pressure",
      "Competitive development exercises",
    ],
    analyticsNote: sharedAnalyticsNote,
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
