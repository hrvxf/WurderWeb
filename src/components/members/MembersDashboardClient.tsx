"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthProvider";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";
import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";

function readActiveGameCode(activeGame: unknown): string | null {
  if (typeof activeGame === "string" && activeGame.trim()) {
    return activeGame.trim();
  }
  if (!activeGame || typeof activeGame !== "object") return null;
  const row = activeGame as Record<string, unknown>;
  const gameCode =
    (typeof row.gameCode === "string" && row.gameCode.trim() ? row.gameCode.trim() : null) ??
    (typeof row.gameId === "string" && row.gameId.trim() ? row.gameId.trim() : null) ??
    (typeof row.code === "string" && row.code.trim() ? row.code.trim() : null);
  return gameCode;
}

type MembersDashboardClientProps = {
  initialActiveGameCode?: string | null;
};

export default function MembersDashboardClient({ initialActiveGameCode = null }: MembersDashboardClientProps) {
  const { profile, stats } = useAuth();
  const activeGameCode = readActiveGameCode(profile?.activeGame) ?? initialActiveGameCode;
  const hasActiveGame = Boolean(activeGameCode);
  const completion = getProfileCompletionStatus(profile ?? null);
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <div className="space-y-7 sm:space-y-8">
      <section className="border-t border-white/10 pt-6 sm:pt-7">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Dashboard</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Member action hub</h2>
          <p className="mt-3 text-sm text-soft sm:text-[0.96rem]">
            Jump into your most common actions from one screen.
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <article className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Session status</p>
            <h3 className="mt-1.5 text-lg font-semibold text-white">Current session</h3>
            {hasActiveGame ? (
              <p className="mt-2 text-sm text-soft">
                Active game:
                <span className="ml-2 font-mono font-semibold tracking-[0.08em] text-white">{activeGameCode}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-soft">No active game right now.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={hasActiveGame ? `/join/${activeGameCode}` : "/join"}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-4 py-2 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D]"
              >
                {hasActiveGame ? "Resume game" : "Join game"}
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Profile completion</p>
            <h3 className="mt-1.5 text-lg font-semibold text-white">Identity status</h3>
            {completion.complete ? (
              <p className="mt-2 text-sm text-emerald-200">Profile complete and ready.</p>
            ) : (
              <p className="mt-2 text-sm text-amber-100">
                Missing:{" "}
                {completion.missingFields
                  .map((field) => (field === "wurderId" ? "Wurder ID" : field === "firstName" ? "first name" : "last name"))
                  .join(", ")}
              </p>
            )}
            <div className="mt-3">
              <Link
                href={AUTH_ROUTES.membersProfile}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/30"
              >
                Edit profile
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Performance snapshot</p>
            <h3 className="mt-1.5 text-lg font-semibold text-white">Recent totals</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-soft">
                Games
                <span className="mt-1 block text-lg font-semibold text-white">{stats.gamesPlayed}</span>
              </p>
              <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-soft">
                Win rate
                <span className="mt-1 block text-lg font-semibold text-white">{winRate}%</span>
              </p>
            </div>
            <div className="mt-3">
              <Link
                href={AUTH_ROUTES.membersStats}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/30"
              >
                Open stats
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-white/15 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Host shortcuts</p>
            <h3 className="mt-1.5 text-lg font-semibold text-white">Session tools</h3>
            <p className="mt-2 text-sm text-soft">Review your hosted sessions.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={AUTH_ROUTES.membersHost}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/30"
              >
                Open host area
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
