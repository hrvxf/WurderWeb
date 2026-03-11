"use client";

import Link from "next/link";

import ProfileCompletionGuard from "@/components/auth/ProfileCompletionGuard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

function readName(firstName?: string, lastName?: string, fallback?: string): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (full) return full;
  if (fallback?.trim()) return fallback.trim();
  return "Wurder Member";
}

export default function MembersDashboardPage() {
  const { profile } = useAuth();
  const stats = profile?.stats ?? {};

  return (
    <ProfileCompletionGuard>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="glass-surface rounded-3xl p-6 sm:p-8">
          <p className="text-sm uppercase tracking-wide text-muted">Welcome back</p>
          <h2 className="mt-2 text-3xl font-bold">
            {readName(profile?.firstName, profile?.lastName, profile?.name)}
          </h2>
          <p className="mt-2 text-soft">
            Your web account is using the same Firebase identity and profile record as the mobile app.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href={AUTH_ROUTES.membersProfile}
              className="rounded-2xl border border-white/15 bg-black/25 p-4 transition hover:bg-black/35"
            >
              <p className="text-sm text-soft">Profile</p>
              <p className="mt-2 text-lg font-semibold">Manage profile details</p>
            </Link>

            <Link
              href={AUTH_ROUTES.membersStats}
              className="rounded-2xl border border-white/15 bg-black/25 p-4 transition hover:bg-black/35"
            >
              <p className="text-sm text-soft">Stats</p>
              <p className="mt-2 text-lg font-semibold">View your latest numbers</p>
            </Link>
          </div>
        </section>

        <aside className="glass-surface rounded-3xl p-6">
          <h3 className="text-xl font-semibold">Profile Snapshot</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <dt className="text-muted">Wurder ID</dt>
              <dd className="font-semibold text-white">{profile?.wurderId ? `@${profile.wurderId}` : "Not set"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <dt className="text-muted">Games played</dt>
              <dd className="font-semibold text-white">{stats.gamesPlayed ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <dt className="text-muted">Points</dt>
              <dd className="font-semibold text-white">{stats.points ?? 0}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </ProfileCompletionGuard>
  );
}
