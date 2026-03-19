"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";

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

type AccessApiPayload = {
  message?: unknown;
  ownershipSource?: unknown;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useManagerRouteGuard(gameCode: string): ManagerRouteGuardState {
  const { user, loading } = useAuth();
  const [state, setState] = useState<ManagerRouteGuardState>({ status: "loading-auth" });

  useEffect(() => {
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
      setState({ status: "unauthenticated", message: "Sign in to access manager dashboards." });
      return;
    }

    let isCancelled = false;

    const checkAccess = async () => {
      setState({ status: "checking-access" });

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/manager/games/${encodeURIComponent(normalizedCode)}/access`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        const payload = (await response.json().catch(() => ({}))) as AccessApiPayload;
        const message = asString(payload.message);
        const ownershipSource = asString(payload.ownershipSource) ?? undefined;

        if (isCancelled) return;

        if (response.ok) {
          setState({ status: "allowed", ownershipSource });
          return;
        }

        if (response.status === 401) {
          setState({ status: "unauthenticated", message: message ?? "Sign in to access manager dashboards." });
          return;
        }

        if (response.status === 403 || response.status === 404) {
          setState({
            status: "forbidden",
            message: message ?? "This account is not authorized to manage this game.",
          });
          return;
        }

        setState({ status: "error", message: message ?? "Unable to verify manager access right now." });
      } catch {
        if (isCancelled) return;
        setState({ status: "error", message: "Unable to verify manager access right now." });
      }
    };

    void checkAccess();

    return () => {
      isCancelled = true;
    };
  }, [gameCode, loading, user]);

  return state;
}
