import { getAchievementBadge, resolveAvailableAchievementBadgeImageKey } from "@/lib/achievements/catalog";
import { ACHIEVEMENT_BADGE_ASSET_BASE_URL } from "@/lib/achievements/config";

function normalizeImageKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function fallbackImageKeyFromId(achievementId: string): string {
  const normalizedId = achievementId.trim().toLowerCase();
  return normalizedId.length > 0 ? `achievement_${normalizedId}` : "achievement_unknown";
}

function imageKeyVariants(primaryKey: string, normalizedAchievementId: string): string[] {
  const variants: string[] = [];
  const add = (value: string | null | undefined) => {
    const normalized = normalizeImageKey(value);
    if (!normalized) return;
    if (!variants.includes(normalized)) variants.push(normalized);
  };

  add(primaryKey);
  if (primaryKey.startsWith("achievement_")) {
    add(primaryKey.replace(/^achievement_/, ""));
  } else {
    add(`achievement_${primaryKey}`);
  }
  if (normalizedAchievementId) {
    add(normalizedAchievementId);
    add(`achievement_${normalizedAchievementId}`);
  }
  add("achievement_unknown");

  return variants;
}

export function getAchievementBadgeImageUrlCandidates(input: { achievementId?: string | null; imageKey?: string | null }): string[] {
  const normalizedId = input.achievementId?.trim().toLowerCase() ?? "";
  const fromInput = normalizeImageKey(input.imageKey);
  const fromCatalog = normalizedId ? getAchievementBadge(normalizedId)?.imageKey : null;
  const primaryImageKey = fromInput ?? fromCatalog ?? fallbackImageKeyFromId(normalizedId);
  const resolvedPrimary = resolveAvailableAchievementBadgeImageKey(primaryImageKey);
  const variants = imageKeyVariants(primaryImageKey, normalizedId);
  const ordered = resolvedPrimary ? [resolvedPrimary, ...variants.filter((variant) => variant !== resolvedPrimary)] : variants;

  const base = trimTrailingSlash(ACHIEVEMENT_BADGE_ASSET_BASE_URL);
  return ordered.map((imageKey) => `${base}/${encodeURIComponent(imageKey)}.png`);
}

export function getAchievementBadgeImageUrl(input: { achievementId?: string | null; imageKey?: string | null }): string {
  return getAchievementBadgeImageUrlCandidates(input)[0] ?? `${trimTrailingSlash(ACHIEVEMENT_BADGE_ASSET_BASE_URL)}/achievement_unknown.png`;
}
