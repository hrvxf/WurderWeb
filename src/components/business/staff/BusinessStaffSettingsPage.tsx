"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessStatePanel from "@/components/business/BusinessStatePanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { businessTeamMemberRoute } from "@/lib/business/routes";

type TeamMemberSettingsPayload = {
  teamMember?: {
    staffKey: string;
    displayName: string;
    orgId: string;
    orgName: string | null;
    sessionsPlayed: number;
  };
  permissions?: {
    canDelete: boolean;
  };
  message?: string;
};

type Props = {
  staffKey: string;
};

export default function BusinessStaffSettingsPage({ staffKey }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading-auth" | "loading-data" | "ready" | "error" | "unauthenticated">("loading-auth");
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<TeamMemberSettingsPayload | null>(null);
  const [confirmDeleteWord, setConfirmDeleteWord] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting">("idle");
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading) {
      setStatus("loading-auth");
      return;
    }
    if (!user) {
      setStatus("unauthenticated");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setStatus("loading-data");
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/business/staff/${encodeURIComponent(staffKey)}/settings`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const body = (await response.json().catch(() => ({}))) as TeamMemberSettingsPayload;
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(body.message ?? "Unable to load team member settings.");
          return;
        }
        setPayload(body);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Unable to load team member settings.");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loading, staffKey, user]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(`/login?next=${encodeURIComponent(`/business/teams/${staffKey}/settings`)}`);
  }, [router, staffKey, status]);

  const member = payload?.teamMember;
  const canDelete = Boolean(payload?.permissions?.canDelete);
  const canSubmitDelete = useMemo(
    () => canDelete && confirmDeleteWord.trim() === "DELETE" && deleteStatus !== "deleting",
    [canDelete, confirmDeleteWord, deleteStatus]
  );

  const deleteTeamMember = async () => {
    if (!user || !canSubmitDelete) return;
    setDeleteStatus("deleting");
    setDeleteMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/business/staff/${encodeURIComponent(staffKey)}/settings`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          confirmText: confirmDeleteWord.trim(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || body.ok !== true) {
        setDeleteMessage(body.message ?? "Unable to delete team member.");
        return;
      }
      router.replace("/business/teams");
    } catch {
      setDeleteMessage("Unable to delete team member.");
    } finally {
      setDeleteStatus("idle");
    }
  };

  return (
    <div className="biz-dark biz-exec mc-rhythm-16 mx-auto w-full max-w-3xl p-3 md:p-4">
      <header className="biz-console p-4">
        <p className="biz-label">Team Member Settings</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{member?.displayName ?? "Team Member"}</h1>
        <p className="mt-1 text-sm text-slate-600">Manage team member profile visibility for business analytics views.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <Link className="text-blue-700 hover:text-blue-900" href={businessTeamMemberRoute(staffKey)}>
            Back to Team Member
          </Link>
          <Link className="text-slate-700 underline underline-offset-2 hover:text-slate-900" href="/business/teams">
            Back to Team
          </Link>
        </div>
      </header>

      {status === "loading-auth" || status === "loading-data" ? (
        <BusinessStatePanel tone="loading" title="Loading Team Member Settings" message="Fetching team member settings and access..." />
      ) : null}

      {status === "error" ? (
        <BusinessStatePanel tone="error" title="Unable To Load Team Member Settings" message={message ?? "Unable to load team member settings."} />
      ) : null}

      {status === "ready" ? (
        <section className="biz-console border-red-500/40 p-4">
          <h2 className="text-base font-semibold text-red-300">Danger Zone</h2>
          {canDelete ? (
            <>
              <p className="mt-2 text-sm text-slate-200">
                Deleting this team member removes the profile from Team Analytics and Team Member views for this organisation.
                This action cannot be undone from the UI.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="text-xs text-slate-300">
                  Type <span className="font-bold">DELETE</span> to confirm
                  <input
                    className="biz-input mt-1"
                    value={confirmDeleteWord}
                    onChange={(event) => setConfirmDeleteWord(event.target.value)}
                    placeholder="DELETE"
                  />
                </label>
                <button
                  type="button"
                  className="biz-btn biz-btn--soft w-fit border-red-400/50 text-red-200 hover:border-red-300 hover:bg-red-900/40"
                  onClick={() => void deleteTeamMember()}
                  disabled={!canSubmitDelete}
                >
                  {deleteStatus === "deleting" ? "Deleting..." : "Delete Team Member"}
                </button>
              </div>
              {deleteMessage ? <p className="mt-2 text-sm text-red-300">{deleteMessage}</p> : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-300">This account cannot delete this team member.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

