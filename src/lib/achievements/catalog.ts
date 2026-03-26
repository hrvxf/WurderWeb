export type AchievementId = string;

export type AchievementCategory = "combat" | "streak" | "wins" | "recognition" | "special";

export type AchievementMetric =
  | "kills"
  | "wins"
  | "bestStreak"
  | "mvpAwards"
  | "gamesPlayed"
  | "kdQualifiedSessions"
  | "accuracyRatio"
  | "cleanClaims"
  | "lowDisputeSessions"
  | "topPerformerSessions"
  | "comebackWins"
  | "ironWallSessions"
  | "activeDays30d"
  | "consistencyQualifiedGames";

export type AchievementBadge = {
  id: AchievementId;
  title: string;
  description: string;
  unlockRequirement: string;
  imageKey: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  threshold: number;
  sortOrder: number;
  tier?: "bronze" | "silver" | "gold" | "platinum";
  requirementLabel?: string;
};

// Transitional adapter: swap this file to consume the true shared package once wired into web.
const CATALOG_ENTRIES: Array<Omit<AchievementBadge, "sortOrder" | "unlockRequirement"> & { unlockRequirement?: string }> = [
  {
    id: "first_blood",
    title: "First Blood",
    description: "Record your first confirmed elimination.",
    imageKey: "achievement_first_blood",
    category: "combat",
    metric: "kills",
    threshold: 1,
  },
  {
    id: "five_kills",
    title: "Eliminator",
    description: "Reach 5 total eliminations.",
    imageKey: "achievement_five_kills",
    category: "combat",
    metric: "kills",
    threshold: 5,
  },
  {
    id: "ten_kills",
    title: "Executioner",
    description: "Reach 10 total eliminations.",
    imageKey: "achievement_ten_kills",
    category: "combat",
    metric: "kills",
    threshold: 10,
  },
  {
    id: "streak_three",
    title: "Hot Streak",
    description: "Reach a 3-elimination streak.",
    imageKey: "achievement_streak_three",
    category: "streak",
    metric: "bestStreak",
    threshold: 3,
  },
  {
    id: "streak_five",
    title: "Untouchable",
    description: "Reach a 5-elimination streak.",
    imageKey: "achievement_streak_five",
    category: "streak",
    metric: "bestStreak",
    threshold: 5,
  },
  {
    id: "streak_ten",
    title: "Unstoppable",
    description: "Reach a 10-elimination streak.",
    imageKey: "streak_ten",
    category: "streak",
    metric: "bestStreak",
    threshold: 10,
  },
  {
    id: "first_win",
    title: "First Win",
    description: "Secure your first session win.",
    imageKey: "achievement_first_win",
    category: "wins",
    metric: "wins",
    threshold: 1,
  },
  {
    id: "five_wins",
    title: "Proven Winner",
    description: "Reach 5 total wins.",
    imageKey: "five_win",
    category: "wins",
    metric: "wins",
    threshold: 5,
  },
  {
    id: "mvp_1",
    title: "MVP",
    description: "Earn MVP once.",
    imageKey: "achievement_mvp_1",
    category: "recognition",
    metric: "mvpAwards",
    threshold: 1,
  },
  {
    id: "mvp_3",
    title: "MVP Elite",
    description: "Earn MVP 3 times.",
    imageKey: "achievement_mvp_3",
    category: "recognition",
    metric: "mvpAwards",
    threshold: 3,
  },
  {
    id: "veteran_25",
    title: "Veteran",
    description: "Complete 25 tracked sessions.",
    imageKey: "achievement_veteran_25",
    category: "special",
    metric: "gamesPlayed",
    threshold: 25,
  },
  {
    id: "survivor_10_sessions",
    title: "Survivor",
    description: "Finish 10 sessions with K/D >= 1.0.",
    imageKey: "achievement_survivor_10_sessions",
    category: "special",
    metric: "kdQualifiedSessions",
    threshold: 10,
    requirementLabel: "K/D-qualified sessions",
  },
  {
    id: "precision_75",
    title: "Precision 75",
    description: "Reach lifetime accuracy >= 75%.",
    imageKey: "achievement_precision_75",
    category: "combat",
    metric: "accuracyRatio",
    threshold: 75,
    requirementLabel: "Accuracy %",
  },
  {
    id: "precision_85",
    title: "Precision 85",
    description: "Reach lifetime accuracy >= 85%.",
    imageKey: "achievement_precision_85",
    category: "combat",
    metric: "accuracyRatio",
    threshold: 85,
    requirementLabel: "Accuracy %",
  },
  {
    id: "clean_claims_20",
    title: "Clean Claims",
    description: "Submit 20 kill claims with dispute rate <= 10%.",
    imageKey: "achievement_clean_claims_20",
    category: "special",
    metric: "cleanClaims",
    threshold: 20,
  },
  {
    id: "low_dispute_10_sessions",
    title: "Low Dispute",
    description: "Complete 10 sessions with zero disputed claims.",
    imageKey: "achievement_low_dispute_10_sessions",
    category: "special",
    metric: "lowDisputeSessions",
    threshold: 10,
  },
  {
    id: "objective_closer_10",
    title: "Objective Closer",
    description: "Be top performer in 10 sessions.",
    imageKey: "achievement_objective_closer_10",
    category: "recognition",
    metric: "topPerformerSessions",
    threshold: 10,
  },
  {
    id: "comeback_win_5",
    title: "Comeback Artist",
    description: "Win 5 sessions after trailing early.",
    imageKey: "achievement_comeback_win_5",
    category: "special",
    metric: "comebackWins",
    threshold: 5,
  },
  {
    id: "iron_wall_5",
    title: "Iron Wall",
    description: "Finish 5 sessions with deaths <= 1 and at least 3 kills.",
    imageKey: "achievement_iron_wall_5",
    category: "combat",
    metric: "ironWallSessions",
    threshold: 5,
  },
  {
    id: "active_operator_30d",
    title: "Active Operator",
    description: "Play on 10 distinct days within 30 days.",
    imageKey: "achievement_active_operator_30d",
    category: "special",
    metric: "activeDays30d",
    threshold: 10,
    requirementLabel: "Active days (30d)",
  },
  {
    id: "consistency_20_games",
    title: "Consistent Operator",
    description: "Maintain win rate >= 55% over 20+ total games.",
    imageKey: "achievement_consistency_20_games",
    category: "wins",
    metric: "consistencyQualifiedGames",
    threshold: 20,
    requirementLabel: "Qualified games",
  },
  {
    id: "kills_25",
    title: "25 Kills",
    description: "Reach 25 total eliminations.",
    imageKey: "achievement_kills_25",
    category: "combat",
    metric: "kills",
    threshold: 25,
  },
  {
    id: "kills_50",
    title: "50 Kills",
    description: "Reach 50 total eliminations.",
    imageKey: "achievement_kills_50",
    category: "combat",
    metric: "kills",
    threshold: 50,
  },
  {
    id: "kills_100",
    title: "100 Kills",
    description: "Reach 100 total eliminations.",
    imageKey: "achievement_kills_100",
    category: "combat",
    metric: "kills",
    threshold: 100,
  },
  {
    id: "kills_250",
    title: "250 Kills",
    description: "Reach 250 total eliminations.",
    imageKey: "achievement_kills_250",
    category: "combat",
    metric: "kills",
    threshold: 250,
  },
  {
    id: "kills_500",
    title: "500 Kills",
    description: "Reach 500 total eliminations.",
    imageKey: "achievement_kills_500",
    category: "combat",
    metric: "kills",
    threshold: 500,
  },
  {
    id: "kills_1000",
    title: "1000 Kills",
    description: "Reach 1000 total eliminations.",
    imageKey: "achievement_kills_1000",
    category: "combat",
    metric: "kills",
    threshold: 1000,
  },
  {
    id: "wins_10",
    title: "10 Wins",
    description: "Reach 10 total wins.",
    imageKey: "achievement_wins_10",
    category: "wins",
    metric: "wins",
    threshold: 10,
  },
  {
    id: "wins_25",
    title: "25 Wins",
    description: "Reach 25 total wins.",
    imageKey: "achievement_wins_25",
    category: "wins",
    metric: "wins",
    threshold: 25,
  },
  {
    id: "wins_50",
    title: "50 Wins",
    description: "Reach 50 total wins.",
    imageKey: "achievement_wins_50",
    category: "wins",
    metric: "wins",
    threshold: 50,
  },
  {
    id: "wins_100",
    title: "100 Wins",
    description: "Reach 100 total wins.",
    imageKey: "achievement_wins_100",
    category: "wins",
    metric: "wins",
    threshold: 100,
  },
  {
    id: "wins_250",
    title: "250 Wins",
    description: "Reach 250 total wins.",
    imageKey: "achievement_wins_250",
    category: "wins",
    metric: "wins",
    threshold: 250,
  },
  {
    id: "wins_500",
    title: "500 Wins",
    description: "Reach 500 total wins.",
    imageKey: "achievement_wins_500",
    category: "wins",
    metric: "wins",
    threshold: 500,
  },
];

function normalizeAchievementId(value: string): AchievementId {
  return value.trim().toLowerCase();
}

function resolveTier(entry: { metric: AchievementMetric; threshold: number; tier?: AchievementBadge["tier"] }): AchievementBadge["tier"] {
  if (entry.tier) return entry.tier;
  if (entry.metric === "wins" || entry.metric === "kills" || entry.metric === "gamesPlayed") {
    if (entry.threshold >= 250) return "platinum";
    if (entry.threshold >= 50) return "gold";
    if (entry.threshold >= 10) return "silver";
    return "bronze";
  }
  if (entry.threshold >= 20) return "gold";
  if (entry.threshold >= 10) return "silver";
  return "bronze";
}

export const ACHIEVEMENT_CATALOG: ReadonlyArray<AchievementBadge> = CATALOG_ENTRIES.map((entry, index) => ({
  ...entry,
  id: normalizeAchievementId(entry.id),
  unlockRequirement: entry.unlockRequirement ?? entry.description,
  tier: resolveTier(entry),
  sortOrder: index,
}));

const CATALOG_BY_ID = new Map<AchievementId, AchievementBadge>(ACHIEVEMENT_CATALOG.map((badge) => [badge.id, badge]));

export function getAchievementBadge(id: string): AchievementBadge | null {
  const normalized = normalizeAchievementId(id);
  if (!normalized) return null;
  return CATALOG_BY_ID.get(normalized) ?? null;
}

export function getAchievementBadgeList(ids: readonly string[]): AchievementBadge[] {
  const byId = new Map<AchievementId, AchievementBadge>();
  for (const rawId of ids) {
    const badge = getAchievementBadge(rawId);
    if (!badge) continue;
    byId.set(badge.id, badge);
  }
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

const AVAILABLE_BADGE_IMAGE_KEYS = new Set<string>([
  "first_blood",
  "first_win",
  "five_kills",
  "five_win",
  "five_wins",
  "kills_100",
  "kills_1000",
  "kills_25",
  "kills_250",
  "kills_50",
  "kills_500",
  "mvp_1",
  "mvp_3",
  "streak_five",
  "streak_ten",
  "streak_three",
  "ten_kills",
  "veteran_25",
  "wins_10",
  "wins_100",
  "wins_25",
  "wins_250",
  "wins_50",
  "wins_500",
]);

function normalizeImageKey(imageKey: string): string {
  return imageKey.trim().toLowerCase();
}

function normalizeImageKeyToBasename(imageKey: string): string {
  const normalized = imageKey.trim().toLowerCase();
  return normalized.startsWith("achievement_") ? normalized.slice("achievement_".length) : normalized;
}

export function hasAchievementBadgeArtwork(badge: AchievementBadge): boolean {
  return resolveAvailableAchievementBadgeImageKey(badge.imageKey) !== null;
}

export function resolveAvailableAchievementBadgeImageKey(imageKey: string): string | null {
  const normalized = normalizeImageKey(imageKey);
  if (!normalized) return null;
  if (AVAILABLE_BADGE_IMAGE_KEYS.has(normalized)) return normalized;

  if (normalized.startsWith("achievement_")) {
    const stripped = normalizeImageKeyToBasename(normalized);
    if (AVAILABLE_BADGE_IMAGE_KEYS.has(stripped)) return stripped;
    return null;
  }

  const prefixed = `achievement_${normalized}`;
  if (AVAILABLE_BADGE_IMAGE_KEYS.has(prefixed)) return prefixed;
  return null;
}

export function getAllAchievementBadgeImageKeys(): string[] {
  return [...AVAILABLE_BADGE_IMAGE_KEYS.values()];
}
