"use client";

import Link from "next/link";

import HostPreviousGamesCard from "@/components/members/HostPreviousGamesCard";

type MembersHostInitialSession = {
  id: string;
  title: string;
  orgId: string | null;
  createdAt: string | null;
  endedAt: string | null;
  recencyMs: number;
};

type MembersHostClientProps = {
  initialSessions?: MembersHostInitialSession[];
};

export default function MembersHostClient({ initialSessions = [] }: MembersHostClientProps) {
  return (
    <section className="space-y-6">
      <div className="border-t border-white/10 pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Host</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Host Area</h2>
        <p className="mt-2 text-sm text-soft">
          Review recent hosted sessions and jump into manager workflows.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HostPreviousGamesCard initialSessions={initialSessions} />
        <section className="border-t border-white/10 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Actions</p>
          <h3 className="mt-2 text-lg font-semibold">Host Actions</h3>
          <p className="mt-2 text-sm text-soft">
            Access reporting, dashboards, and game creation tools.
          </p>
          <div className="mt-4 grid gap-2.5">
            <Link
              href="/admin/create-company-game"
              className="min-h-10 rounded-xl border border-white/15 bg-black/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/30"
            >
              Start session
            </Link>
            <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/90">
              Business dashboard coming soon
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
