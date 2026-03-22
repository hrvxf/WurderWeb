"use client";

import { useAuth } from "@/lib/auth/AuthProvider";

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

export default function MembersDashboardClient() {
  const { profile } = useAuth();
  const activeGameCode = readActiveGameCode(profile?.activeGame);
  const hasActiveGame = Boolean(activeGameCode);

  return (
    <div className="space-y-7 sm:space-y-8">
      <section className="border-t border-white/10 pt-6 sm:pt-7">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Dashboard</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Current session</h2>
          {hasActiveGame ? (
            <p className="mt-3 text-sm text-soft sm:text-[0.96rem]">
              You are currently in an active game:
              <span className="ml-2 font-mono font-semibold tracking-[0.08em] text-white">{activeGameCode}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-soft sm:text-[0.96rem]">
              No active game right now. Use the top actions to join a session when you are ready.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Your profile, stats, hosting, and account controls are in the header.</p>
        </div>
      </section>

    </div>
  );
}
