"use client";

import { motion } from "framer-motion";

import AchievementBadgeIcon from "@/components/achievements/AchievementBadgeIcon";
import type { AchievementBadge } from "@/lib/achievements/catalog";

export default function AchievementMedalTile({
  badge,
  unlocked,
  selected,
  onClick,
}: {
  badge: AchievementBadge;
  unlocked: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const tierGlow =
    badge.tier === "platinum"
      ? "drop-shadow-[0_0_12px_rgba(167,243,208,0.35)]"
      : badge.tier === "gold"
        ? "drop-shadow-[0_0_10px_rgba(253,230,138,0.28)]"
        : badge.tier === "silver"
          ? "drop-shadow-[0_0_8px_rgba(203,213,225,0.24)]"
          : badge.tier === "bronze"
            ? "drop-shadow-[0_0_7px_rgba(251,146,60,0.2)]"
            : "";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`${badge.title} medal, ${unlocked ? "unlocked" : "locked"}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`group relative aspect-square overflow-hidden rounded-md transition ${
        selected ? "ring-2 ring-[#D96A5A]/75" : "focus-visible:ring-2 focus-visible:ring-white/70"
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-1.5">
        <AchievementBadgeIcon
          achievementId={badge.id}
          imageKey={badge.imageKey}
          unlocked={unlocked}
          alt={`${badge.title} medal`}
          className={`h-full w-full object-contain ${tierGlow} ${unlocked ? "" : "grayscale opacity-80"}`}
        />
      </div>

      {!unlocked ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <span className="rounded-full bg-black/55 p-1.5 text-white/90" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
        </div>
      ) : null}
    </motion.button>
  );
}
