"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";

function isE2EBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_E2E_BYPASS_AUTH === "1") return true;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("__E2E_BYPASS_MANAGER_AUTH__") === "1";
}

export type ManagerRouteGuardStatus =
  | "loading-auth"
  | "unauthenticated"
  | "checking-access"
  | "forbidden"
  | "allowed"
  | "error";

type ManagerRouteGuardState = {
  status: ManagerRouteGuardStatus;
  message?: string;
  ownershipSource?: string;
};

export function useManagerRouteGuard(gameCode: string): ManagerRouteGuardState {
  const { user, loading } = useAuth();
  const [state, setState] = useState<ManagerRouteGuardState>({ status: "loading-auth" });

  useEffect(() => {
    if (isE2EBypassEnabled()) {
      setState({ status: "allowed", ownershipSource: "e2e_bypass" });
      return;
    }

    const normalizedCode = gameCode.trim();
    if (!normalizedCode) {
      setState({ status: "forbidden", message: "Missing game code." });
      return;
    }

    if (loading) {
      setState({ status: "loading-auth" });
      return;
    }

    if (!user) {
      setState({ status: "unauthenticated", message: "Sign in to access Business session dashboards." });
      return;
    }
    // Skip preflight access API call. Dashboard API is the source of truth and
    // already enforces auth/authorization; this avoids an extra network round-trip.
    setState({ status: "allowed", ownershipSource: "dashboard_route" });
  }, [gameCode, loading, user]);

  return state;
}
