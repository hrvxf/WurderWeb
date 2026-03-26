"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import LogoutButton from "@/components/auth/LogoutButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

const memberNav = [
  { href: AUTH_ROUTES.members, label: "Dashboard", description: "Overview and active game" },
  { href: AUTH_ROUTES.membersProfile, label: "Profile", description: "Manage profile" },
  { href: AUTH_ROUTES.membersStats, label: "Stats", description: "View performance" },
  { href: AUTH_ROUTES.membersHost, label: "Host", description: "Run host workflows" },
  { href: AUTH_ROUTES.membersSettings, label: "Settings", description: "Account options" },
];

type MemberShellProps = {
  children: ReactNode;
  initialDisplayName?: string;
  initialWurderId?: string | null;
  initialAvatarUrl?: string | null;
};

function getDisplayName(firstName?: string, lastName?: string, fallbackName?: string): string {
  const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (combined) return combined;
  if (fallbackName?.trim()) return fallbackName.trim();
  return "Wurder Member";
}

function readActiveGameCode(activeGame: unknown): string | null {
  if (typeof activeGame === "string" && activeGame.trim()) {
    return activeGame.trim();
  }
  if (!activeGame || typeof activeGame !== "object") return null;
  const row = activeGame as Record<string, unknown>;
  return (
    (typeof row.gameCode === "string" && row.gameCode.trim() ? row.gameCode.trim() : null) ??
    (typeof row.gameId === "string" && row.gameId.trim() ? row.gameId.trim() : null) ??
    (typeof row.code === "string" && row.code.trim() ? row.code.trim() : null)
  );
}

function playerRankFromPoints(pointsLifetime: number): string {
  if (pointsLifetime >= 3000) return "Mastermind";
  if (pointsLifetime >= 1500) return "Strategist";
  if (pointsLifetime >= 500) return "Operative";
  if (pointsLifetime > 0) return "Recruit";
  return "Unranked";
}

export default function MemberShell({
  children,
  initialDisplayName,
  initialWurderId,
  initialAvatarUrl,
}: MemberShellProps) {
  const pathname = usePathname();
  const { profile, user, stats } = useAuth();

  const profileDisplayName = getDisplayName(profile?.firstName, profile?.lastName, profile?.name);
  const profileWurderId = profile?.wurderId?.trim() ? profile.wurderId.trim() : null;
  const profileAvatar =
    profile?.avatarUrl?.trim() ||
    profile?.avatar?.trim() ||
    user?.photoURL?.trim() ||
    initialAvatarUrl?.trim() ||
    null;
  const profileEmail = profile?.email?.trim() || user?.email?.trim() || null;
  const activeGameCode = readActiveGameCode(profile?.activeGame);
  const lifetimePoints = stats.lifetimePoints ?? stats.points ?? 0;
  const playerRank = playerRankFromPoints(lifetimePoints);

  const displayName = initialDisplayName ?? profileDisplayName;
  const displayWurderId = profileWurderId ?? initialWurderId ?? null;
  const activeNavLabel = memberNav.find((item) => item.href === pathname)?.label ?? "Dashboard";

  return (
    <section className="space-y-7 sm:space-y-8">
      <div className="border-t border-white/10 pt-6 sm:pt-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {profileAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileAvatar}
                alt={`${displayName} avatar`}
                className="h-12 w-12 rounded-full border border-white/20 object-cover sm:h-14 sm:w-14"
              />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm font-bold text-white sm:h-14 sm:w-14 sm:text-base">
                {(displayName[0] ?? "W").toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-soft">Members</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[2rem]">{displayName}</h1>
              <p className="mt-1 text-sm text-muted">Member profile</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap lg:justify-end">
            <Link
              href={activeGameCode ? `/join/${activeGameCode}` : "/join"}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#C7355D] to-[#8E1F45] px-4 py-2.5 text-sm font-semibold text-white transition hover:from-[#D96A5A] hover:to-[#C7355D]"
            >
              {activeGameCode ? "Resume game" : "Join game"}
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="mt-5 grid border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-white/10 lg:grid-cols-4">
          <div className="border-b border-white/10 px-0 py-2.5 sm:px-3 sm:py-3 lg:border-b-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Email</p>
            <p className="mt-1 text-sm text-white">{profileEmail ?? "Not available"}</p>
          </div>
          <div className="border-b border-white/10 px-0 py-2.5 sm:px-3 sm:py-3 lg:border-b-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Wurder ID</p>
            <p className="mt-1 text-sm text-white">{displayWurderId ? `@${displayWurderId}` : "Not set"}</p>
          </div>
          <div className="border-b border-white/10 px-0 py-2.5 sm:px-3 sm:py-3 lg:border-b-0">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Player rank</p>
            <p className="mt-1 text-sm text-white">{playerRank}</p>
          </div>
          <div className="px-0 py-2.5 sm:px-3 sm:py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Lifetime points</p>
            <p className="mt-1 text-sm text-white">{lifetimePoints}</p>
          </div>
        </div>

        <nav className="mt-5 border-t border-white/10 pt-4" aria-label="Members navigation">
          <div className="grid border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-white/10 lg:grid-cols-5">
            {memberNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b border-white/10 px-3 py-3 transition sm:border-b-0 ${
                    active ? "bg-[#D96A5A]/12 text-white" : "text-soft hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={`mt-0.5 block text-xs ${active ? "text-white/80" : "text-muted"}`}>
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">Current section: {activeNavLabel}</p>
      </div>

      {children}
    </section>
  );
}
