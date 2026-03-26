import {
  resolveAchievementBadgeAssetKey,
  resolveAchievementBadgeImageUrl,
  sanitizeAchievementBadgeAssetKeys,
} from "@/lib/achievements/badge-assets";

describe("achievement badge asset resolver", () => {
  it("uses backend-provided badge asset key when present", () => {
    const imageUrl = resolveAchievementBadgeImageUrl({
      achievementId: "first_blood",
      badgeAssetKeys: { first_blood: "first_blood" },
    });

    expect(imageUrl).toBe("/images/achievements/first_blood.png");
  });

  it("falls back to static catalog mapping when backend key is missing", () => {
    const imageUrl = resolveAchievementBadgeImageUrl({
      achievementId: "first_blood",
      badgeAssetKeys: {},
    });

    expect(imageUrl).toBe("/images/achievements/achievement_first_blood.png");
  });

  it("falls back to legacy naming convention for unknown achievements", () => {
    const assetKey = resolveAchievementBadgeAssetKey({
      achievementId: "unknown_special",
      badgeAssetKeys: {},
    });

    expect(assetKey).toBe("achievement_unknown_special");
  });

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
