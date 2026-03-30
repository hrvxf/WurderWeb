export const CANONICAL_GAME_MODES = ["classic", "elimination", "elimination_multi", "guilds"] as const;

export type CanonicalGameMode = (typeof CANONICAL_GAME_MODES)[number];

const CANONICAL_MODE_SET = new Set<string>(CANONICAL_GAME_MODES);

const LEGACY_MODE_ALIASES: Record<string, CanonicalGameMode> = {
  guild: "guilds",
  ring: "elimination",
};

function normalizeRawMode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

export function parseCanonicalGameMode(value: unknown): CanonicalGameMode | null {
  const normalized = normalizeRawMode(value);
  if (!normalized) return null;
  if (CANONICAL_MODE_SET.has(normalized)) return normalized as CanonicalGameMode;
  return LEGACY_MODE_ALIASES[normalized] ?? null;
}

export function isCanonicalGameMode(value: unknown): value is CanonicalGameMode {
  const normalized = normalizeRawMode(value);
  return CANONICAL_MODE_SET.has(normalized);
}
