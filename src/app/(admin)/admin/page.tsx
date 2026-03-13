"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";

type AdminSessionState =
  | { status: "loading" }
  | { status: "authorized"; email: string | null; uid: string }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

async function authorizedAdminRequest(path: string, token: string, method = "GET") {
  const response = await fetch(path, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [session, setSession] = useState<AdminSessionState>({ status: "loading" });
  const [actionStatus, setActionStatus] = useState<string>("");

  const verifyAdminSession = useCallback(async () => {
    if (!user) return;

    setSession({ status: "loading" });
    const token = await user.getIdToken();
    const { response, body } = await authorizedAdminRequest("/api/admin/session", token);

    if (response.ok) {
      setSession({
        status: "authorized",
        uid: String(body.uid ?? ""),
        email: body.email ?? null,
      });
      return;
    }

    if (response.status === 403) {
      setSession({
        status: "forbidden",
        message: body.message ?? "Your account is not on the system admin allowlist.",
      });
      return;
    }

    if (response.status === 401) {
      setSession({
        status: "error",
        message: body.message ?? "Please sign in again to access admin tools.",
      });
      return;
    }

    setSession({
      status: "error",
      message: body.message ?? "Unable to validate your admin session.",
    });
  }, [user]);

  useEffect(() => {
    if (loading || !user) return;
    void verifyAdminSession();
  }, [loading, user, verifyAdminSession]);

  const runAction = useCallback(async () => {
    if (!user || session.status !== "authorized") return;

    setActionStatus("Running privileged action...");
    const token = await user.getIdToken();
    const { response, body } = await authorizedAdminRequest("/api/admin/actions/refresh-cache", token, "POST");

    if (!response.ok) {
      setActionStatus(body.message ?? "Action failed.");
      return;
    }

    setActionStatus("Action completed. Audit log written in backend.");
  }, [session.status, user]);

  if (loading || session.status === "loading") {
    return <div className="glass-surface rounded-3xl p-8 text-soft">Checking system admin access...</div>;
  }

  if (session.status === "forbidden") {
    return (
      <section className="glass-surface rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">System Admin Console</h1>
        <p className="mt-3 text-red-200">{session.message}</p>
      </section>
    );
  }

  if (session.status === "error") {
    return (
      <section className="glass-surface rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">System Admin Console</h1>
        <p className="mt-3 text-red-200">{session.message}</p>
      </section>
    );
  }

  return (
    <section className="glass-surface rounded-3xl p-8">
      <h1 className="text-2xl font-semibold">System Admin Console</h1>
      <p className="mt-2 text-soft">Signed in as {session.email ?? session.uid}</p>
      <p className="mt-4 text-soft">
        This web-only console is backend-gated. All privileged actions require authenticated system-admin
        authorization.
      </p>
      <button
        type="button"
        onClick={() => {
          void runAction();
        }}
        className="mt-6 rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
      >
        Run privileged backend action
      </button>
      {actionStatus ? <p className="mt-3 text-sm text-soft">{actionStatus}</p> : null}
    </section>
  );
}
