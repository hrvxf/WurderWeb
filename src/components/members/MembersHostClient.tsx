"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import HostPreviousGamesCard from "@/components/members/HostPreviousGamesCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

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
  const { user, isAuthenticated } = useAuth();
  const [businessWorkspaceActivated, setBusinessWorkspaceActivated] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setBusinessWorkspaceActivated(false);
      return;
    }

    let cancelled = false;
    const resolveAccess = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/business/workspace-access", {
          headers: { authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as { activated?: unknown };
        if (cancelled) return;
        setBusinessWorkspaceActivated(response.ok && payload.activated === true);
      } catch {
        if (cancelled) return;
        setBusinessWorkspaceActivated(false);
      }
    };

    void resolveAccess();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

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
            Access business tools without leaving your member workspace.
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {businessWorkspaceActivated ? (
              <>
                <Link
                  href={BUSINESS_ROUTES.createSession}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-4 py-2.5 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D]"
                >
                  Start business session
                </Link>
                <Link
                  href={BUSINESS_ROUTES.dashboard}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-black/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/30"
                >
                  Open Business dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={BUSINESS_ROUTES.home}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-black/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/30"
                >
                  Explore Business
                </Link>
                <p className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/90">
                  Business workspace activates after org ownership or manager access is granted.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
