"use client";

import { useEffect, useMemo, useState } from "react";

import AchievementMedalDetailPanel from "@/components/achievements/AchievementMedalDetailPanel";
import AchievementMedalTile from "@/components/achievements/AchievementMedalTile";
import {
  ACHIEVEMENT_CATALOG,
  getAchievementBadge,
  hasAchievementBadgeArtwork,
  type AchievementBadge,
} from "@/lib/achievements/catalog";
import type { MemberStatsSummary } from "@/lib/auth/member-stats";

type MedalView = {
  badge: AchievementBadge;
  unlocked: boolean;
  progressCurrent: number | null;
  progressTarget: number;
};

function progressValueForMetric(badge: AchievementBadge, stats: MemberStatsSummary): number | null {
  if (badge.metric === "kills") return stats.kills ?? 0;
  if (badge.metric === "wins") return stats.wins ?? 0;
  if (badge.metric === "bestStreak") return stats.bestStreak ?? 0;
  if (badge.metric === "mvpAwards") return stats.mvpAwards ?? 0;
  if (badge.metric === "gamesPlayed") return stats.gamesPlayed ?? 0;
  return null;
}

export default function AchievementsCard({ achievementIds, stats }: { achievementIds: string[]; stats: MemberStatsSummary }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const normalizedUnlockedIds = useMemo(
    () => [...new Set(achievementIds.map((id) => id.trim().toLowerCase()).filter(Boolean))],
    [achievementIds]
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const unknown = normalizedUnlockedIds.filter((id) => !getAchievementBadge(id));
    if (unknown.length > 0) console.warn("[achievements] Unknown achievement IDs in AchievementsCard", unknown);
  }, [normalizedUnlockedIds]);

  const medalViews = useMemo(() => {
    const unlockedSet = new Set(normalizedUnlockedIds);
    return ACHIEVEMENT_CATALOG
      .filter((badge) => hasAchievementBadgeArtwork(badge))
      .map((badge) => ({
        badge,
        unlocked: unlockedSet.has(badge.id),
        progressCurrent: progressValueForMetric(badge, stats),
        progressTarget: badge.threshold,
      })) satisfies MedalView[];
  }, [normalizedUnlockedIds, stats]);

  const achieved = useMemo(() => medalViews.filter((item) => item.unlocked), [medalViews]);
  const locked = useMemo(() => medalViews.filter((item) => !item.unlocked), [medalViews]);

  useEffect(() => {
    if (!selectedId) return;
    if (!medalViews.some((item) => item.badge.id === selectedId)) setSelectedId(null);
  }, [medalViews, selectedId]);

  const selected = medalViews.find((item) => item.badge.id === selectedId) ?? null;

  return (
    <section className="rounded-2xl border border-white/15 bg-[linear-gradient(165deg,rgba(18,22,33,0.96),rgba(9,12,18,0.98))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Progression</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Achievements</h3>
          <p className="mt-1 text-sm text-white/65">Inspect earned and upcoming medals from your Wurder career.</p>
        </div>
        <span className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold text-white/85">
          {achieved.length}/{medalViews.length} unlocked
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.04] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/80">Achieved Medals</p>
          <span className="text-xs text-emerald-100/75">{achieved.length}</span>
        </div>

        {achieved.length === 0 ? (
          <p className="mt-3 rounded-lg border border-white/12 bg-black/25 px-3 py-2 text-sm text-white/70">
            No medals unlocked yet. Keep playing sessions to start collecting achievements.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8">
            {achieved.map((item) => (
              <AchievementMedalTile
                key={item.badge.id}
                badge={item.badge}
                unlocked
                selected={selectedId === item.badge.id}
                onClick={() => setSelectedId(item.badge.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/12 bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/75">Locked Medals</p>
          <span className="text-xs text-white/60">{locked.length}</span>
        </div>

        {locked.length === 0 ? (
          <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-100/90">
            All catalog medals unlocked. Outstanding.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8">
            {locked.map((item) => (
              <AchievementMedalTile
                key={item.badge.id}
                badge={item.badge}
                unlocked={false}
                selected={selectedId === item.badge.id}
                onClick={() => setSelectedId(item.badge.id)}
              />
            ))}
          </div>
        )}
      </div>

      <AchievementMedalDetailPanel
        open={selected != null}
        badge={selected?.badge ?? null}
        unlocked={selected?.unlocked ?? false}
        progressCurrent={selected?.progressCurrent ?? null}
        progressTarget={selected?.progressTarget ?? 1}
        onClose={() => setSelectedId(null)}
      />
    </section>
  );
}
