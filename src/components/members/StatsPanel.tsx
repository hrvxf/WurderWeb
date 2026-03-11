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
    <div className="glass-surface rounded-3xl p-6">
      <h2 className="text-xl font-semibold">Stats Summary</h2>
      <p className="mt-1 text-sm text-soft">Data is pulled from your canonical profile document.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statFields.map((field) => (
          <div key={field.key} className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{field.label}</p>
            <p className="mt-2 text-2xl font-semibold">{stats[field.key] ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
