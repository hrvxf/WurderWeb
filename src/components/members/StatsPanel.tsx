import type { MemberStatsSummary } from "@/lib/auth/member-stats";

const statFields: Array<{ key: keyof MemberStatsSummary; label: string }> = [
  { key: "gamesPlayed", label: "Games Played" },
  { key: "wins", label: "Wins" },
  { key: "kills", label: "Kills" },
  { key: "deaths", label: "Deaths" },
  { key: "bestStreak", label: "Best Streak" },
  { key: "points", label: "Points" },
  { key: "lifetimePoints", label: "Lifetime Points" },
  { key: "mvpAwards", label: "MVP Awards" },
];

export default function StatsPanel({ stats }: { stats: MemberStatsSummary }) {

  return (
    <div className="glass-surface rounded-3xl p-6">
      <h2 className="text-xl font-semibold">Stats Summary</h2>
      <p className="mt-1 text-sm text-soft">Gameplay aggregates are pulled from your member stats document.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statFields.map((field) => (
          <div key={field.key} className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{field.label}</p>
            <p className="mt-2 text-2xl font-semibold">{stats[field.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
