"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import AchievementBadgeIcon from "@/components/achievements/AchievementBadgeIcon";
import type { AchievementBadge } from "@/lib/achievements/catalog";

export default function AchievementMedalDetailPanel({
  open,
  badge,
  unlocked,
  progressCurrent,
  progressTarget,
  onClose,
}: {
  open: boolean;
  badge: AchievementBadge | null;
  unlocked: boolean;
  progressCurrent: number | null;
  progressTarget: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const ratio = progressCurrent == null ? null : Math.max(0, Math.min(1, progressCurrent / Math.max(progressTarget, 1)));
  const statusClasses = unlocked
    ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-100"
    : "border-amber-300/30 bg-amber-400/12 text-amber-100";

  return (
    <AnimatePresence>
      {open && badge ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Medal details">
          <motion.button
            type="button"
            aria-label="Close medal details"
            className="absolute inset-0 bg-black/65"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="absolute bottom-0 right-0 top-auto z-10 w-full rounded-t-2xl border border-white/15 bg-[linear-gradient(165deg,rgba(11,14,22,0.97),rgba(8,10,16,0.99))] p-4 shadow-[0_30px_70px_rgba(0,0,0,0.55)] sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0 sm:top-0"
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/55">Medal details</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{badge.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close medal details"
            className="rounded-md border border-white/25 bg-white/[0.06] px-2.5 py-1 text-sm text-white/85 hover:bg-white/[0.12]"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/12 bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl border p-2 ${unlocked ? "border-[#E7C27D]/45 bg-[#E7C27D]/12" : "border-white/15 bg-black/35"}`}>
              <AchievementBadgeIcon
                achievementId={badge.id}
                imageKey={badge.imageKey}
                unlocked={unlocked}
                alt={`${badge.title} medal image`}
                className={`h-12 w-12 rounded-sm object-contain ${unlocked ? "" : "grayscale opacity-80"}`}
              />
            </div>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClasses}`}>
              {unlocked ? "Unlocked" : "Locked"}
            </span>
          </div>

          <p className="mt-4 text-sm text-white/85">{badge.description || "No description is available for this medal yet."}</p>

          <div className="mt-4 rounded-lg border border-white/12 bg-black/30 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">How to unlock</p>
            <p className="mt-1 text-sm text-white/85">{badge.unlockRequirement || "Unlock requirement is currently unavailable."}</p>
          </div>

          <div className="mt-4 rounded-lg border border-white/12 bg-black/25 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Progress</p>
            {ratio == null ? (
              <p className="mt-1 text-sm text-white/70">Progress tracking for this medal will appear here when metric data is available.</p>
            ) : (
              <>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#D96A5A]" style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-white/75">
                  {Math.min(progressCurrent ?? 0, progressTarget)} / {progressTarget}
                </p>
              </>
            )}
          </div>

          <p className="mt-3 text-xs text-white/70">
            Tier: <span className="font-semibold uppercase text-white/90">{badge.tier ?? "standard"}</span>
          </p>
        </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
