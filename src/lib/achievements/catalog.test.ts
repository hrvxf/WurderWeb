import { ACHIEVEMENT_CATALOG, getAchievementBadge, getAchievementBadgeList } from "@/lib/achievements/catalog";
import { sanitizeAchievementBadgeAssetKeys } from "@/lib/achievements/badge-asset-keys";
import {
  getAchievementBadgeImageUrl,
  getAchievementBadgeImageUrlCandidates,
} from "@/lib/achievements/getAchievementBadgeImageUrl";

describe("achievement catalog adapter", () => {
  it("resolves known badges by id", () => {
    const badge = getAchievementBadge("first_blood");
    expect(badge?.title).toBe("First Blood");
    expect(badge?.imageKey).toBe("achievement_first_blood");
    expect(badge?.unlockRequirement).toBeTruthy();
  });

  it("returns deterministic badge list order based on catalog sortOrder", () => {
    const badges = getAchievementBadgeList(["wins_100", "first_blood", "first_blood", "wins_10"]);
    expect(badges.map((badge) => badge.id)).toEqual(["first_blood", "wins_10", "wins_100"]);
  });

  it("returns null for unknown badge ids", () => {
    expect(getAchievementBadge("not_real")).toBeNull();
  });

  it("contains no duplicate badge ids", () => {
    const ids = ACHIEVEMENT_CATALOG.map((badge) => badge.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("achievement badge image resolver", () => {
  it("builds image url from catalog metadata", () => {
    expect(getAchievementBadgeImageUrl({ achievementId: "first_blood" })).toBe(
      "/images/achievements/achievement_first_blood.png"
    );
  });

  it("falls back safely for unknown badges", () => {
    expect(getAchievementBadgeImageUrl({ achievementId: "unknown_special" })).toBe(
      "/images/achievements/achievement_unknown_special.png"
    );
  });

  it("uses explicit image key when provided", () => {
    expect(getAchievementBadgeImageUrl({ achievementId: "first_blood", imageKey: "custom_key" })).toBe(
      "/images/achievements/custom_key.png"
    );
  });

  it("includes both prefixed and unprefixed URL candidates for known badges", () => {
    const firstBloodCandidates = getAchievementBadgeImageUrlCandidates({ achievementId: "first_blood" });
    const veteranCandidates = getAchievementBadgeImageUrlCandidates({ achievementId: "veteran_25" });

    expect(firstBloodCandidates.slice(0, 2)).toEqual([
      "/images/achievements/achievement_first_blood.png",
      "/images/achievements/first_blood.png",
    ]);
    expect(veteranCandidates.slice(0, 2)).toEqual([
      "/images/achievements/achievement_veteran_25.png",
      "/images/achievements/veteran_25.png",
    ]);
  });
});

describe("achievement badge asset key sanitization", () => {
  it("sanitizes badge key maps from unknown payloads", () => {
    const sanitized = sanitizeAchievementBadgeAssetKeys({
      first_blood: " first_blood ",
      empty: "   ",
      numeric: 42,
      "": "invalid",
    });

    expect(sanitized).toEqual({
      first_blood: "first_blood",
    });
  });
});
