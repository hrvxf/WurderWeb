"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthProvider";
import { resolveMemberRenderState } from "@/lib/auth/member-render-state";
import { AUTH_ROUTES, toNextPath } from "@/lib/auth/route-helpers";

type AuthGateProps = {
  children: ReactNode;
  requireCompleteProfile?: boolean;
};

export default function AuthGate({ children, requireCompleteProfile = false }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, profile, loading, profileLoading } = useAuth();
  const renderState = resolveMemberRenderState(profile);

  useEffect(() => {
    if (loading || profileLoading) return;

    if (!isAuthenticated) {
      const nextPath = toNextPath(pathname || AUTH_ROUTES.members);
      router.replace(`${AUTH_ROUTES.login}?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (requireCompleteProfile && !renderState.complete) {
      router.replace(AUTH_ROUTES.membersProfile);
    }
  }, [isAuthenticated, loading, pathname, renderState.complete, profileLoading, requireCompleteProfile, router]);

  if (loading || profileLoading) {
    return (
      <div className="glass-surface rounded-3xl p-8 text-center text-soft">
        Checking your member session...
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireCompleteProfile && !renderState.complete) return null;

  return <>{children}</>;
}
