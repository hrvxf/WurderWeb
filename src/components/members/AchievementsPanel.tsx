"use client";

import { useEffect, useMemo, useState } from "react";

import { resolveAchievementBadgeImageUrl, type AchievementBadgeAssetKeyMap } from "@/lib/achievements/badge-assets";
import type { MemberStatsSummary } from "@/lib/auth/member-stats";

type AchievementCategory = "combat" | "streak" | "wins" | "recognition" | "special";
type SortKey = "status" | "progress" | "name";

type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  metric:
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
  threshold: number;
  requirementLabel?: string;
};

type AchievementView = AchievementDefinition & {
  unlocked: boolean;
  progress: number;
  progressRatio: number;
};

type AchievementProgress = {
  kdQualifiedSessions: number;
  accuracyPercent: number;
  cleanClaims: number;
  lowDisputeSessions: number;
  topPerformerSessions: number;
  comebackWins: number;
  ironWallSessions: number;
  activeDays30d: number;
  consistencyQualifiedGames: number;
};

const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: "first_blood",
    title: "First Blood",
    description: "Record your first confirmed elimination.",
    category: "combat",
    metric: "kills",
    threshold: 1,
  },
  {
    id: "five_kills",
    title: "Eliminator",
    description: "Reach 5 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 5,
  },
  {
    id: "ten_kills",
    title: "Executioner",
    description: "Reach 10 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 10,
  },
  {
    id: "streak_three",
    title: "Hot Streak",
    description: "Reach a 3-elimination streak.",
    category: "streak",
    metric: "bestStreak",
    threshold: 3,
  },
  {
    id: "streak_five",
    title: "Untouchable",
    description: "Reach a 5-elimination streak.",
    category: "streak",
    metric: "bestStreak",
    threshold: 5,
  },
  {
    id: "first_win",
    title: "First Win",
    description: "Secure your first session win.",
    category: "wins",
    metric: "wins",
    threshold: 1,
  },
  {
    id: "five_wins",
    title: "Proven Winner",
    description: "Reach 5 total wins.",
    category: "wins",
    metric: "wins",
    threshold: 5,
  },
  {
    id: "mvp_1",
    title: "MVP",
    description: "Earn MVP once.",
    category: "recognition",
    metric: "mvpAwards",
    threshold: 1,
  },
  {
    id: "mvp_3",
    title: "MVP Elite",
    description: "Earn MVP 3 times.",
    category: "recognition",
    metric: "mvpAwards",
    threshold: 3,
  },
  {
    id: "veteran_25",
    title: "Veteran",
    description: "Complete 25 tracked sessions.",
    category: "special",
    metric: "gamesPlayed",
    threshold: 25,
  },
  {
    id: "survivor_10_sessions",
    title: "Survivor",
    description: "Finish 10 sessions with K/D >= 1.0.",
    category: "special",
    metric: "kdQualifiedSessions",
    threshold: 10,
    requirementLabel: "K/D-qualified sessions",
  },
  {
    id: "precision_75",
    title: "Precision 75",
    description: "Reach lifetime accuracy >= 75%.",
    category: "combat",
    metric: "accuracyRatio",
    threshold: 75,
    requirementLabel: "Accuracy %",
  },
  {
    id: "precision_85",
    title: "Precision 85",
    description: "Reach lifetime accuracy >= 85%.",
    category: "combat",
    metric: "accuracyRatio",
    threshold: 85,
    requirementLabel: "Accuracy %",
  },
  {
    id: "clean_claims_20",
    title: "Clean Claims",
    description: "Submit 20 kill claims with dispute rate <= 10%.",
    category: "special",
    metric: "cleanClaims",
    threshold: 20,
  },
  {
    id: "low_dispute_10_sessions",
    title: "Low Dispute",
    description: "Complete 10 sessions with zero disputed claims.",
    category: "special",
    metric: "lowDisputeSessions",
    threshold: 10,
  },
  {
    id: "objective_closer_10",
    title: "Objective Closer",
    description: "Be top performer in 10 sessions.",
    category: "recognition",
    metric: "topPerformerSessions",
    threshold: 10,
  },
  {
    id: "comeback_win_5",
    title: "Comeback Artist",
    description: "Win 5 sessions after trailing early.",
    category: "special",
    metric: "comebackWins",
    threshold: 5,
  },
  {
    id: "iron_wall_5",
    title: "Iron Wall",
    description: "Finish 5 sessions with deaths <= 1 and at least 3 kills.",
    category: "combat",
    metric: "ironWallSessions",
    threshold: 5,
  },
  {
    id: "active_operator_30d",
    title: "Active Operator",
    description: "Play on 10 distinct days within 30 days.",
    category: "special",
    metric: "activeDays30d",
    threshold: 10,
    requirementLabel: "Active days (30d)",
  },
  {
    id: "consistency_20_games",
    title: "Consistent Operator",
    description: "Maintain win rate >= 55% over 20+ total games.",
    category: "wins",
    metric: "consistencyQualifiedGames",
    threshold: 20,
    requirementLabel: "Qualified games",
  },
  {
    id: "kills_25",
    title: "25 Kills",
    description: "Reach 25 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 25,
  },
  {
    id: "kills_50",
    title: "50 Kills",
    description: "Reach 50 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 50,
  },
  {
    id: "kills_100",
    title: "100 Kills",
    description: "Reach 100 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 100,
  },
  {
    id: "kills_250",
    title: "250 Kills",
    description: "Reach 250 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 250,
  },
  {
    id: "kills_500",
    title: "500 Kills",
    description: "Reach 500 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 500,
  },
  {
    id: "kills_1000",
    title: "1000 Kills",
    description: "Reach 1000 total eliminations.",
    category: "combat",
    metric: "kills",
    threshold: 1000,
  },
  {
    id: "wins_10",
    title: "10 Wins",
    description: "Reach 10 total wins.",
    category: "wins",
    metric: "wins",
    threshold: 10,
  },
  {
    id: "wins_25",
    title: "25 Wins",
    description: "Reach 25 total wins.",
    category: "wins",
    metric: "wins",
    threshold: 25,
  },
  {
    id: "wins_50",
    title: "50 Wins",
    description: "Reach 50 total wins.",
    category: "wins",
    metric: "wins",
    threshold: 50,
  },
  {
    id: "wins_100",
    title: "100 Wins",
    description: "Reach 100 total wins.",
    category: "wins",
    metric: "wins",
    threshold: 100,
  },
  {
    id: "wins_250",
    title: "250 Wins",
    description: "Reach 250 total wins.",
    category: "wins",
    metric: "wins",
    threshold: 250,
  },
  {
    id: "wins_500",
    title: "500 Wins",
    description: "Reach 500 total wins.",
    category: "wins",
    metric: "wins",
    threshold: 500,
  },
];

const CATEGORY_OPTIONS: Array<{ value: "all" | AchievementCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "combat", label: "Combat" },
  { value: "streak", label: "Streak" },
  { value: "wins", label: "Wins" },
  { value: "recognition", label: "Recognition" },
  { value: "special", label: "Special" },
];

function metricLabel(metric: AchievementDefinition["metric"]): string {
  if (metric === "kills") return "Kills";
  if (metric === "wins") return "Wins";
  if (metric === "bestStreak") return "Best streak";
  if (metric === "mvpAwards") return "MVP awards";
  if (metric === "gamesPlayed") return "Games played";
  if (metric === "kdQualifiedSessions") return "K/D-qualified sessions";
  if (metric === "accuracyRatio") return "Accuracy %";
  if (metric === "cleanClaims") return "Clean claims";
  if (metric === "lowDisputeSessions") return "Low-dispute sessions";
  if (metric === "topPerformerSessions") return "Top performer sessions";
  if (metric === "comebackWins") return "Comeback wins";
  if (metric === "ironWallSessions") return "Iron wall sessions";
  if (metric === "activeDays30d") return "Active days (30d)";
  return "Qualified games";
}

function categoryStyle(category: AchievementCategory, unlocked: boolean): string {
  if (!unlocked) return "border-white/15 bg-white/[0.02] text-white/55";
  if (category === "combat") return "border-rose-300/35 bg-rose-400/10 text-rose-100";
  if (category === "streak") return "border-cyan-300/35 bg-cyan-400/10 text-cyan-100";
  if (category === "wins") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (category === "recognition") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  return "border-violet-300/35 bg-violet-400/10 text-violet-100";
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function parseUnknownAchievement(id: string): AchievementDefinition {
  return {
    id,
    title: toTitleCase(id.replace(/[_-]+/g, " ")),
    description: "Unlocked special achievement.",
    category: "special",
    metric: "gamesPlayed",
    threshold: 1,
  };
}

function buildAchievementViews(input: {
  achievementIds: string[];
  stats: MemberStatsSummary;
  progress: AchievementProgress;
}): AchievementView[] {
  const unlockedSet = new Set(input.achievementIds.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const known = ACHIEVEMENT_CATALOG.map((item) => {
    const winRate = input.stats.gamesPlayed > 0 ? input.stats.wins / input.stats.gamesPlayed : 0;
    const rawProgressByMetric: Record<AchievementDefinition["metric"], number> = {
      kills: input.stats.kills ?? 0,
      wins: input.stats.wins ?? 0,
      bestStreak: input.stats.bestStreak ?? 0,
      mvpAwards: input.stats.mvpAwards ?? 0,
      gamesPlayed: input.stats.gamesPlayed ?? 0,
      kdQualifiedSessions: input.progress.kdQualifiedSessions,
      accuracyRatio: input.progress.accuracyPercent,
      cleanClaims: input.progress.cleanClaims,
      lowDisputeSessions: input.progress.lowDisputeSessions,
      topPerformerSessions: input.progress.topPerformerSessions,
      comebackWins: input.progress.comebackWins,
      ironWallSessions: input.progress.ironWallSessions,
      activeDays30d: input.progress.activeDays30d,
      consistencyQualifiedGames: input.progress.consistencyQualifiedGames || (winRate >= 0.55 ? input.stats.gamesPlayed ?? 0 : 0),
    };
    const progress = Math.max(0, rawProgressByMetric[item.metric] ?? 0);
    const ratio = Math.min(1, progress / Math.max(item.threshold, 1));
    return {
      ...item,
      unlocked: unlockedSet.has(item.id),
      progress,
      progressRatio: ratio,
    } satisfies AchievementView;
  });

  const unknownUnlocked = Array.from(unlockedSet)
    .filter((id) => !ACHIEVEMENT_CATALOG.some((catalogItem) => catalogItem.id === id))
    .map((id) => {
      const parsed = parseUnknownAchievement(id);
      return {
        ...parsed,
        unlocked: true,
        progress: 1,
        progressRatio: 1,
      } satisfies AchievementView;
    });

  return [...known, ...unknownUnlocked];
}

export default function AchievementsPanel({
  achievementIds,
  achievementBadgeAssetKeys,
  stats,
  progress,
}: {
  achievementIds: string[];
  achievementBadgeAssetKeys?: AchievementBadgeAssetKeyMap;
  stats: MemberStatsSummary;
  progress: AchievementProgress;
}) {
  const [category, setCategory] = useState<"all" | AchievementCategory>("all");
  const [showLocked, setShowLocked] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("status");
  const achievements = useMemo(
    () => buildAchievementViews({ achievementIds, stats, progress }),
    [achievementIds, progress, stats]
  );
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});

  useEffect(() => {
    setBrokenImages({});
  }, [achievementBadgeAssetKeys]);

  const unlockedCount = achievements.filter((item) => item.unlocked).length;

  const recentUnlocked = useMemo(() => achievements.filter((item) => item.unlocked).slice(0, 3), [achievements]);
  const filtered = useMemo(() => {
    const base = achievements.filter((item) => (category === "all" ? true : item.category === category));
    const lockFiltered = showLocked ? base : base.filter((item) => item.unlocked);
    const sorted = [...lockFiltered];
    sorted.sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "progress") return b.progressRatio - a.progressRatio;
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.progressRatio - a.progressRatio;
    });
    return sorted;
  }, [achievements, category, showLocked, sortBy]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Achievements</p>
          <h3 className="mt-1 text-base font-semibold text-white">Progress and unlocks</h3>
        </div>
        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-white/80">
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setCategory(option.value)}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
              category === option.value
                ? "border-[#D96A5A]/70 bg-[#D96A5A]/15 text-white"
                : "border-white/15 bg-white/[0.03] text-white/70 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/75">
          <input type="checkbox" checked={showLocked} onChange={(event) => setShowLocked(event.target.checked)} />
          Show locked
        </label>
        <select
          className="rounded-full border border-white/15 bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold text-white"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortKey)}
        >
          <option value="status">Sort: status</option>
          <option value="progress">Sort: progress</option>
          <option value="name">Sort: name</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/65">
          No achievements match your current filters.
        </p>
      ) : (
        <div className="mt-3">
          {recentUnlocked.length > 0 ? (
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-white/55">
              <span className="uppercase tracking-[0.12em]">Recent</span>
              {recentUnlocked.map((item) => (
                <span key={`recent-${item.id}`} className={`rounded-full border px-2 py-0.5 font-semibold ${categoryStyle(item.category, true)}`}>
                  {item.title}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {filtered.map((achievement) => {
              const active = selected?.id === achievement.id;
              const icon = achievement.unlocked ? "*" : "o";
              const badgeImageUrl = resolveAchievementBadgeImageUrl({
                achievementId: achievement.id,
                badgeAssetKeys: achievementBadgeAssetKeys,
              });
              return (
                <button
                  key={achievement.id}
                  type="button"
                  onClick={() => setSelectedId(achievement.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                    active ? "border-white/35 bg-white/[0.08]" : "border-white/10 bg-black/25 hover:bg-white/[0.04]"
                  }`}
                >
                  {!brokenImages[achievement.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={badgeImageUrl}
                      alt=""
                      className="h-4 w-4 rounded-sm object-contain"
                      onError={() =>
                        setBrokenImages((current) =>
                          current[achievement.id] ? current : { ...current, [achievement.id]: true }
                        )
                      }
                    />
                  ) : (
                    <span className={achievement.unlocked ? "text-[#F6C37A]" : "text-white/45"}>{icon}</span>
                  )}
                  <span className={achievement.unlocked ? "text-white/90" : "text-white/60"}>
                    {achievement.title}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">Selected</p>
            <p className="mt-1 text-sm font-semibold text-white">{selected?.title ?? "Select an achievement"}</p>
            <p className="mt-1 text-xs text-white/70">{selected?.description ?? "Select an item for details."}</p>
            {selected ? (
              <>
                <p className="mt-2 text-[11px] text-white/60">
                  Category: <span className="text-white/85">{toTitleCase(selected.category)}</span>
                </p>
                <p className="mt-1 text-[11px] text-white/60">
                  Requirement: <span className="text-white/85">{selected.threshold} {(selected.requirementLabel ?? metricLabel(selected.metric)).toLowerCase()}</span>
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#D96A5A]" style={{ width: `${Math.round(selected.progressRatio * 100)}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-white/60">
                  Current: <span className="text-white/85">{Math.min(selected.progress, selected.threshold)}</span>
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
