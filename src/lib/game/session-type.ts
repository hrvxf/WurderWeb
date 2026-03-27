export const SESSION_GAME_TYPES = ["personal", "business"] as const;

export type SessionGameType = (typeof SESSION_GAME_TYPES)[number];
