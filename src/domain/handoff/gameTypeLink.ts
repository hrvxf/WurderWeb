export const GAME_TYPE_OPTIONS = ["b2c", "b2b"] as const;

export type GameType = (typeof GAME_TYPE_OPTIONS)[number];

export function isGameType(value: string): value is GameType {
  return GAME_TYPE_OPTIONS.includes(value as GameType);
}

export function buildGameTypeOpenPlayLink(gameType: GameType): string {
  return `wurder://?gameType=${gameType}&openPlay=1&skipResume=1`;
}
