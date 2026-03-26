"use client";

import { useEffect, useMemo, useState } from "react";

import { getAchievementBadgeImageUrlCandidates } from "@/lib/achievements/getAchievementBadgeImageUrl";

type AchievementBadgeIconProps = {
  achievementId?: string | null;
  imageKey?: string | null;
  unlocked?: boolean;
  alt?: string;
  className?: string;
};

export default function AchievementBadgeIcon({
  achievementId,
  imageKey,
  unlocked = false,
  alt = "Achievement badge",
  className,
}: AchievementBadgeIconProps) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidateUrls = useMemo(
    () => getAchievementBadgeImageUrlCandidates({ achievementId: achievementId ?? null, imageKey: imageKey ?? null }),
    [achievementId, imageKey]
  );
  const imageUrl = candidateUrls[Math.min(candidateIndex, Math.max(0, candidateUrls.length - 1))] ?? "";
  const exhaustedCandidates = candidateUrls.length === 0 || candidateIndex >= candidateUrls.length;

  useEffect(() => {
    setCandidateIndex(0);
  }, [achievementId, imageKey]);

  if (exhaustedCandidates) {
    return <span className={unlocked ? "text-[#F6C37A]" : "text-white/45"}>{unlocked ? "*" : "o"}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      className={className ?? "h-4 w-4 rounded-sm object-contain"}
      onError={() => setCandidateIndex((current) => current + 1)}
      loading="eager"
      decoding="async"
    />
  );
}
