"use client";

import type { MemberStatsSummary } from "@/lib/auth/member-stats";

type Timeframe = "7d" | "30d" | "90d" | "all";

type StatField = {
  key: keyof MemberStatsSummary;
  label: string;
  definition: string;
};

type StatGroup = {
  title: string;
  subtitle: string;
  fields: StatField[];
};

const STAT_GROUPS: StatGroup[] = [
  {
    title: "Combat",
    subtitle: "Direct in-game engagements and survivability.",
    fields: [
      { key: "kills", label: "Kills", definition: "Confirmed elimination count." },
      { key: "deaths", label: "Deaths", definition: "Caught/defeated count based on profile aggregate fields." },
      { key: "bestStreak", label: "Best Streak", definition: "Highest consecutive elimination run." },
    ],
  },
  {
    title: "Session Outcomes",
    subtitle: "How often sessions convert into wins.",
    fields: [
      { key: "gamesPlayed", label: "Games Played", definition: "Total tracked sessions." },
      { key: "wins", label: "Wins", definition: "Total sessions won." },
      { key: "mvpAwards", label: "MVP Awards", definition: "Count from achievementIds and MVP aliases." },
    ],
  },
  {
    title: "Progression",
    subtitle: "Long-term scoring progression.",
    fields: [
      { key: "points", label: "Points", definition: "Current points aggregate (mirrors lifetime while separated metric is pending)." },
      { key: "lifetimePoints", label: "Lifetime Points", definition: "All-time points total." },
    ],
  },
];

export default function StatsPanel({ stats, timeframe }: { stats: MemberStatsSummary; timeframe: Timeframe }) {
  return (
    <div className="border-t border-white/10 pt-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">Performance</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h3 className="text-2xl font-semibold tracking-tight">Stats Summary</h3>
        <span className="rounded-full border border-white/20 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
          timeframe: {timeframe}
        </span>
      </div>
      <p className="mt-2 text-sm text-soft">Gameplay aggregates are pulled from your member profile stats.</p>
      <p className="mt-1 text-xs text-muted">Points currently mirrors Lifetime Points until a separate points metric is published.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {STAT_GROUPS.map((group) => (
          <section key={group.title} className="surface-panel p-3">
            <h4 className="text-sm font-semibold text-white">{group.title}</h4>
            <p className="mt-1 text-xs text-white/55">{group.subtitle}</p>
            <div className="mt-3 space-y-2">
              {group.fields.map((field) => (
                <div key={field.key} className="surface-panel-muted px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted" title={field.definition}>
                      {field.label}
                    </p>
                    <p className="text-xl font-semibold text-white">{stats[field.key] ?? 0}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">{field.definition}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
