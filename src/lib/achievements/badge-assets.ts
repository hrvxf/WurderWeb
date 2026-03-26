const ACHIEVEMENT_BADGE_BASE_PATH = "/images/achievements";

const STATIC_ACHIEVEMENT_BADGE_ASSET_KEYS: Record<string, string> = {
  first_blood: "achievement_first_blood",
  five_kills: "achievement_five_kills",
  ten_kills: "achievement_ten_kills",
  streak_three: "achievement_streak_three",
  streak_five: "achievement_streak_five",
  first_win: "achievement_first_win",
  five_wins: "achievement_five_wins",
  mvp_1: "achievement_mvp_1",
  mvp_3: "achievement_mvp_3",
  veteran_25: "achievement_veteran_25",
};

export type AchievementBadgeAssetKeyMap = Record<string, string>;

function normalizeAssetKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeAchievementBadgeAssetKeys(
  source: unknown
): AchievementBadgeAssetKeyMap {
  if (!source || typeof source !== "object") return {};
  const entries = Object.entries(source as Record<string, unknown>)
    .map(([achievementId, assetKey]) => [achievementId.trim(), normalizeAssetKey(assetKey)] as const)
    .filter(([achievementId, assetKey]) => achievementId.length > 0 && assetKey !== null);
  return Object.fromEntries(entries) as AchievementBadgeAssetKeyMap;
}

function resolveStaticAchievementBadgeAssetKey(achievementId: string): string {
  return STATIC_ACHIEVEMENT_BADGE_ASSET_KEYS[achievementId] ?? `achievement_${achievementId}`;
}

export function resolveAchievementBadgeAssetKey(input: {
  achievementId: string;
  badgeAssetKeys?: AchievementBadgeAssetKeyMap | null;
}): string {
  const backendAssetKey = input.badgeAssetKeys?.[input.achievementId];
  const normalizedBackendAssetKey = normalizeAssetKey(backendAssetKey);
  if (normalizedBackendAssetKey) return normalizedBackendAssetKey;
  return resolveStaticAchievementBadgeAssetKey(input.achievementId);
}

export function resolveAchievementBadgeImageUrl(input: {
  achievementId: string;
  badgeAssetKeys?: AchievementBadgeAssetKeyMap | null;
}): string {
  const assetKey = resolveAchievementBadgeAssetKey(input);
  return `${ACHIEVEMENT_BADGE_BASE_PATH}/${assetKey}.png`;
}
