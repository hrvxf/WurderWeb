"use client";

import type { WurderUserProfile } from "@/lib/types/user";

const statFields: Array<{ key: keyof NonNullable<WurderUserProfile["stats"]>; label: string }> = [
  { key: "gamesPlayed", label: "Games Played" },
  { key: "wins", label: "Wins" },
  { key: "kills", label: "Kills" },
  { key: "deaths", label: "Deaths" },
  { key: "streak", label: "Best Streak" },
  { key: "points", label: "Points" },
  { key: "pointsLifetime", label: "Lifetime Points" },
  { key: "mvpAwards", label: "MVP Awards" },
];

export default function StatsPanel({ profile }: { profile: WurderUserProfile | null }) {
  const stats = profile?.stats ?? {};

  return (
    <div className="border-t border-white/10 pt-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">Performance</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">Stats Summary</h3>
      <p className="mt-2 text-sm text-soft">
        Gameplay aggregates are pulled from your profile stats document (`profiles/{'{uid}'}`).
      </p>
      <p className="mt-1 text-xs text-muted">
        Points currently mirrors Lifetime Points until a separate points metric is published.
      </p>

      <div className="mt-5 grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {statFields.map((field, index) => (
          <div
            key={field.key}
            className={`py-4 pr-3 sm:px-3 lg:px-4 ${index >= 2 ? "lg:border-t lg:border-white/10" : ""}`}
          >
            <p className="text-xs uppercase tracking-wide text-muted">{field.label}</p>
            <p className="mt-1.5 text-2xl font-semibold">{stats[field.key] ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
