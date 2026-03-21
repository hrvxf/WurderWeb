"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import LogoutButton from "@/components/auth/LogoutButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { resolveMemberRenderState } from "@/lib/auth/member-render-state";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

const memberNav = [
  { href: AUTH_ROUTES.members, label: "Dashboard" },
  { href: AUTH_ROUTES.membersProfile, label: "Profile" },
  { href: AUTH_ROUTES.membersStats, label: "Stats" },
];

function getDisplayName(firstName?: string, lastName?: string, fallbackName?: string): string {
  const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (combined) return combined;
  if (fallbackName?.trim()) return fallbackName.trim();
  return "Wurder Member";
}

export default function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const displayName = getDisplayName(profile?.firstName, profile?.lastName, profile?.name);
  const renderState = resolveMemberRenderState(profile);
  const missingFieldsKey = renderState.missingFields.join("|");
  const displayWurderId = profile?.wurderId?.trim()
    ? `@${profile.wurderId}`
    : renderState.missingFields.length
      ? `Profile incomplete: missing ${renderState.missingFields.join(", ")}`
      : "Wurder ID not set";

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const timestamp = new Date().toISOString();
    console.info("MEMBERS_RENDER_PROFILE", {
      uid: profile?.uid ?? null,
      timestamp,
      pathname,
      profile,
    });
    console.info("MEMBERS_RENDER_COMPLETION", {
      uid: profile?.uid ?? null,
      timestamp,
      pathname,
      complete: renderState.complete,
      missingFields: renderState.missingFields,
    });
  }, [missingFieldsKey, pathname, profile, renderState.complete, renderState.missingFields]);

  return (
    <section className="space-y-6">
      <div className="glass-surface rounded-3xl px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-soft">Members Area</p>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="mt-1 text-sm text-muted">{displayWurderId}</p>
          </div>
          <LogoutButton />
        </div>
        <nav className="mt-4 flex flex-wrap gap-2">
          {memberNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[#D96A5A] bg-[#D96A5A]/20 text-white"
                    : "border-white/15 bg-black/25 text-soft hover:bg-black/35 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </section>
  );
}
