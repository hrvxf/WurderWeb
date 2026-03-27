export const SESSION_GAME_TYPES = ["b2c", "b2b"] as const;

export type SessionGameType = (typeof SESSION_GAME_TYPES)[number];

export function normalizeSessionGameType(value: unknown): SessionGameType | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  // Transitional compatibility for legacy persisted values during migration.
  if (normalized === "b2c" || normalized === "personal") return "b2c";
  if (normalized === "b2b" || normalized === "business") return "b2b";
  return null;
}

export function isBusinessSessionType(value: SessionGameType | null | undefined): boolean {
  return value === "b2b";
}
