import { preload } from "react-dom";

import MembersStatsClient from "@/components/members/MembersStatsClient";
import { getAllAchievementBadgeImageKeys } from "@/lib/achievements/catalog";
import { ACHIEVEMENT_BADGE_ASSET_BASE_URL } from "@/lib/achievements/config";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { readInitialMemberStatsData } from "@/lib/auth/member-stats.server";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersStatsPage() {
  const { uid } = await requireMemberAccess({
    nextPath: AUTH_ROUTES.membersStats,
    requireCompleteProfile: true,
  });
  const initialData = await readInitialMemberStatsData(uid);

  const badgeAssetBase = ACHIEVEMENT_BADGE_ASSET_BASE_URL.endsWith("/")
    ? ACHIEVEMENT_BADGE_ASSET_BASE_URL.slice(0, -1)
    : ACHIEVEMENT_BADGE_ASSET_BASE_URL;
  for (const imageKey of getAllAchievementBadgeImageKeys()) {
    preload(`${badgeAssetBase}/${encodeURIComponent(imageKey)}.png`, { as: "image" });
  }

  return <MembersStatsClient initialData={initialData} />;
}
