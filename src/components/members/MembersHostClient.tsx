"use client";

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
          Review recent hosted sessions and jump into session workflows.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HostPreviousGamesCard initialSessions={initialSessions} />
        <section className="border-t border-white/10 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Actions</p>
          <h3 className="mt-2 text-lg font-semibold">Host Actions</h3>
          <p className="mt-2 text-sm text-soft">
            Access your host history and personal session tools.
          </p>
          <div className="mt-4 grid gap-2.5">
            <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/90">
              Business workspace is available from the Business navigation.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
