"use client";

import StatsPanel from "@/components/members/StatsPanel";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function MembersStatsClient() {
  const { profile } = useAuth();
  return (
    <section className="space-y-6">
      <div className="border-t border-white/10 pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Stats</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your performance</h2>
        <p className="mt-2 text-sm text-soft">Review your cumulative game metrics and trend indicators.</p>
      </div>
      <StatsPanel profile={profile} />
    </section>
  );
}
