"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import BusinessStatePanel from "@/components/business/BusinessStatePanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { businessOrgRoute, businessSessionsRoute } from "@/lib/business/routes";

type OrgSettingsPayload = {
  org?: {
    orgId: string;
    name: string | null;
    ownershipSource: string;
  };
  permissions?: {
    canDelete: boolean;
  };
  message?: string;
};

type Props = {
  orgId: string;
};

export default function BusinessOrganizationSettingsPage({ orgId }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading-auth" | "loading-data" | "ready" | "error" | "unauthenticated">("loading-auth");
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<OrgSettingsPayload | null>(null);
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
        const response = await fetch(`/api/orgs/${encodeURIComponent(orgId)}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const body = (await response.json().catch(() => ({}))) as OrgSettingsPayload;
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(body.message ?? "Unable to load organisation settings.");
          return;
        }
        setPayload(body);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Unable to load organisation settings.");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loading, orgId, user]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(`/login?next=${encodeURIComponent(`/business/orgs/${orgId}/settings`)}`);
  }, [orgId, router, status]);

  const canDelete = Boolean(payload?.permissions?.canDelete);
  const normalizedOrgId = payload?.org?.orgId ?? orgId;
  const orgName = payload?.org?.name?.trim() || "Unassigned Organisation";

  const canSubmitDelete = useMemo(
    () => confirmDeleteWord.trim() === "DELETE" && canDelete && deleteStatus !== "deleting",
    [canDelete, confirmDeleteWord, deleteStatus]
  );

  const deleteOrganization = async () => {
    if (!user || !canSubmitDelete) return;
    setDeleteStatus("deleting");
    setDeleteMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/orgs/${encodeURIComponent(normalizedOrgId)}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          confirmText: confirmDeleteWord.trim(),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as { message?: string; ok?: boolean };
      if (!response.ok || body.ok !== true) {
        setDeleteMessage(body.message ?? "Unable to delete organisation.");
        return;
      }

      router.replace(businessSessionsRoute());
    } catch {
      setDeleteMessage("Unable to delete organisation.");
    } finally {
      setDeleteStatus("idle");
    }
  };

  return (
    <div className="biz-dark biz-exec mc-rhythm-16 mx-auto w-full max-w-3xl p-3 md:p-4">
      <header className="biz-console p-4">
        <p className="biz-label">Organisation Settings</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{orgName}</h1>
        <p className="mt-1 text-sm text-slate-600">Configure organisation-level settings and irreversible actions.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <Link className="text-blue-700 hover:text-blue-900" href={businessOrgRoute(normalizedOrgId)}>
            Back to Organisation
          </Link>
          <Link className="text-slate-700 underline underline-offset-2 hover:text-slate-900" href={businessSessionsRoute()}>
            Open Sessions
          </Link>
        </div>
      </header>

      {status === "loading-auth" || status === "loading-data" ? (
        <BusinessStatePanel tone="loading" title="Loading Organisation Settings" message="Fetching permissions and organisation metadata..." />
      ) : null}

      {status === "error" ? (
        <BusinessStatePanel tone="error" title="Unable To Load Organisation Settings" message={message ?? "Unable to load organisation settings."} />
      ) : null}

      {status === "ready" ? (
        <section className="biz-console border-red-500/40 p-4">
          <h2 className="text-base font-semibold text-red-300">Danger Zone</h2>
          {canDelete ? (
            <>
              <p className="mt-2 text-sm text-slate-200">
                Deleting this organisation will remove organisation records and manager links. This action cannot be undone.
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
                  onClick={() => void deleteOrganization()}
                  disabled={!canSubmitDelete}
                >
                  {deleteStatus === "deleting" ? "Deleting..." : "Delete Organisation"}
                </button>
              </div>
              {deleteMessage ? <p className="mt-2 text-sm text-red-300">{deleteMessage}</p> : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-300">Only the organisation owner can delete this organisation.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
