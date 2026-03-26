export type AchievementBadgeAssetKeyMap = Record<string, string>;

function normalizeAssetKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeAchievementBadgeAssetKeys(source: unknown): AchievementBadgeAssetKeyMap {
  if (!source || typeof source !== "object") return {};
  const entries = Object.entries(source as Record<string, unknown>)
    .map(([achievementId, assetKey]) => [achievementId.trim(), normalizeAssetKey(assetKey)] as const)
    .filter(([achievementId, assetKey]) => achievementId.length > 0 && assetKey !== null);
  return Object.fromEntries(entries) as AchievementBadgeAssetKeyMap;
}
