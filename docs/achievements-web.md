# Achievement Badges (Web)

Wurder Web now resolves achievement metadata from one canonical catalog adapter:
- `src/lib/achievements/catalog.ts`
- exports: `AchievementId`, `AchievementBadge`, `ACHIEVEMENT_CATALOG`, `getAchievementBadge(id)`, `getAchievementBadgeList(ids)`
- `AchievementBadge` includes `unlockRequirement` for medal detail UI

Badge image URLs are centralized in:
- `src/lib/achievements/getAchievementBadgeImageUrl.ts`
- base URL config: `src/lib/achievements/config.ts` (`NEXT_PUBLIC_ACHIEVEMENT_BADGE_ASSET_BASE_URL`)

UI rendering components:
- `src/components/achievements/AchievementBadgeIcon.tsx`
- `src/components/achievements/AchievementMedalTile.tsx`
- `src/components/achievements/AchievementMedalDetailPanel.tsx`
- `src/components/achievements/AchievementsCard.tsx`

Data contract for web surfaces:
- consume `achievementIds: string[]` from profile/stats payloads
- do not require stored title/description/imageUrl/tier per user

How to add a new badge:
1. Add the badge entry to the shared catalog source (currently transitional adapter in `catalog.ts`).
2. Ensure the matching badge image key exists in badge asset hosting.
3. Web surfaces rendering from `achievementIds` will pick it up automatically.

Note:
- `catalog.ts` is intentionally marked as a transitional adapter until the external shared package is wired into this repo.
