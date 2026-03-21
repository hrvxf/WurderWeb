"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  const displayName = getDisplayName(profile?.firstName, profile?.lastName, profile?.name);
  const renderState = resolveMemberRenderState(profile);
  const missingFieldsKey = renderState.missingFields.join("|");
  const displayWurderId = profile?.wurderId?.trim()
    ? `@${profile.wurderId}`
    : renderState.missingFields.length
      ? `Profile incomplete: missing ${renderState.missingFields.join(", ")}`
      : "Wurder ID not set";
  const [sessionDebugEnabled, setSessionDebugEnabled] = useState(false);
  const configuredDebugUid = process.env.NEXT_PUBLIC_MEMBERS_DEBUG_UID?.trim();
  const configuredDebugFlagUid = process.env.NEXT_PUBLIC_MEMBERS_DEBUG_FLAG_UID?.trim();

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

  useEffect(() => {
    const uid = user?.uid?.trim();
    if (!uid) {
      setSessionDebugEnabled(false);
      return;
    }

    const sessionKey = `members-debug-panel:${uid}`;
    const debugParam = searchParams.get("membersDebug");

    if (debugParam === "1" || debugParam === "true" || debugParam === "on") {
      sessionStorage.setItem(sessionKey, "1");
    } else if (debugParam === "0" || debugParam === "false" || debugParam === "off") {
      sessionStorage.removeItem(sessionKey);
    }

    setSessionDebugEnabled(sessionStorage.getItem(sessionKey) === "1");
  }, [searchParams, user?.uid]);

  const showDebugPanel = useMemo(() => {
    const uid = user?.uid?.trim();
    if (!uid) return false;
    const uidMatchesConfigured = Boolean(configuredDebugUid && uid === configuredDebugUid);
    const uidMatchesSessionFlagTarget = Boolean(configuredDebugFlagUid && uid === configuredDebugFlagUid);
    return uidMatchesConfigured || (uidMatchesSessionFlagTarget && sessionDebugEnabled);
  }, [configuredDebugFlagUid, configuredDebugUid, sessionDebugEnabled, user?.uid]);

  const debugPayload = useMemo(
    () => ({
      authContext: {
        uid: user?.uid ?? null,
        email: user?.email ?? null,
      },
      rawAccountFields: profile?.debugProfileResolution?.rawAccountFields ?? null,
      resolvedCanonicalProfile: profile
        ? {
            uid: profile.uid,
            email: profile.email,
            firstName: profile.firstName ?? null,
            lastName: profile.lastName ?? null,
            name: profile.name ?? null,
            wurderId: profile.wurderId ?? null,
            wurderIdLower: profile.wurderIdLower ?? null,
            avatarUrl: profile.avatarUrl ?? null,
            avatarPath: profile.avatarPath ?? null,
          }
        : null,
      completionStatus: renderState.complete,
      missingFields: renderState.missingFields,
      sourcePaths: profile?.debugProfileResolution?.sourcePaths ?? [],
      snapshotAt: profile?.debugProfileResolution?.snapshotAt ?? null,
      renderPath: pathname,
    }),
    [pathname, profile, renderState.complete, renderState.missingFields, user?.email, user?.uid]
  );

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

      {showDebugPanel ? (
        <aside className="rounded-2xl border border-amber-300/50 bg-amber-100/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Temporary members debug panel</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-3 text-xs text-amber-100">
            {JSON.stringify(debugPayload, null, 2)}
          </pre>
        </aside>
      ) : null}

      {children}
    </section>
  );
}
