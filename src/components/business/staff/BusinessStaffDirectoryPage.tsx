"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessStatePanel from "@/components/business/BusinessStatePanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { readClientCache, writeClientCache } from "@/lib/business/client-response-cache";
import { businessStaffExportApiRoute } from "@/lib/business/routes";

type StaffRow = {
  staffKey: string;
  displayName: string;
  orgId: string;
  orgName: string | null;
  sessionsPlayed: number;
  latestAccuracyRatio: number | null;
  trendIndicator: "up" | "down" | "flat" | "unknown";
  identityConfidence: "high" | "medium" | "low";
  identityNeedsReview: boolean;
  identitySource: string;
  latestObservedAt?: string | null;
  latestSessionName?: string | null;
  avgDisputeRateRatio?: number | null;
};

type StaffPayload = {
  directory?: StaffRow[];
  message?: string;
};

const STAFF_DIRECTORY_CACHE_TTL_MS = 45_000;

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function trendLabel(value: StaffRow["trendIndicator"]): string {
  if (value === "up") return "Improving";
  if (value === "down") return "Declining";
  if (value === "flat") return "Steady";
  return "Insufficient Data";
}

function trendPillClass(value: StaffRow["trendIndicator"]): string {
  if (value === "up") return "biz-pill biz-pill--ended";
  if (value === "down") return "biz-pill biz-pill--in_progress";
  if (value === "flat") return "biz-pill biz-pill--neutral";
  return "biz-pill biz-pill--insufficient";
}

function orgLabel(name: string | null): string {
  return name?.trim() || "Unassigned Organisation";
}

export default function BusinessStaffDirectoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading-auth" | "loading-data" | "ready" | "error" | "unauthenticated">("loading-auth");
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [searchText, setSearchText] = useState("");
  const [exportStatus, setExportStatus] = useState<"idle" | "downloading">("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);

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
      const cacheKey = "business.staff.directory.v1.default";
      const cached = readClientCache<StaffPayload>(cacheKey, STAFF_DIRECTORY_CACHE_TTL_MS);
      const hasCachedRows = Array.isArray(cached?.directory);
      if (hasCachedRows) {
        setRows((cached?.directory as StaffRow[]) ?? []);
        setStatus("ready");
      } else {
        setStatus("loading-data");
      }
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/business/staff", {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const payload = (await response.json().catch(() => ({}))) as StaffPayload;
        if (cancelled) return;
        if (!response.ok) {
          if (hasCachedRows) return;
          setStatus("error");
          setMessage(payload.message ?? "Unable to load team analytics.");
          return;
        }
        writeClientCache(cacheKey, payload);
        setRows(Array.isArray(payload.directory) ? payload.directory : []);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        if (hasCachedRows) return;
        setStatus("error");
        setMessage("Unable to load team analytics.");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    router.replace(`/login?next=${encodeURIComponent("/business/teams")}`);
  }, [router, status]);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.displayName,
        row.orgName ?? "",
        row.orgId,
        row.latestSessionName ?? "",
        row.trendIndicator,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, searchText]);

  const exportStaffCsv = async () => {
    if (!user) return;
    setExportStatus("downloading");
    setExportMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(businessStaffExportApiRoute(""), {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        setExportMessage(errorPayload.message ?? "Unable to export team stats.");
        return;
      }
      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "team-stats.csv";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setExportMessage("Team CSV exported.");
    } catch {
      setExportMessage("Unable to export team stats.");
    } finally {
      setExportStatus("idle");
    }
  };

  return (
    <div className="biz-dark biz-exec mc-rhythm-16 p-3 md:p-4">
      <section className="biz-sessions-shell">
        <header className="biz-sessions-toolbar">
          <div>
            <p className="biz-label">Performance Console</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Team Analytics</h1>
            <p className="mt-1 text-sm text-slate-600">Longitudinal analytics are shown separately from single-session metrics.</p>
          </div>
        </header>

        <section className="biz-sessions-block">
          <h2 className="text-lg font-semibold text-slate-900">Search</h2>
          <div className="mt-3">
            <input
              className="biz-input text-sm"
              placeholder="Search team member, organisation, or session"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void exportStaffCsv()} disabled={exportStatus === "downloading"} className="biz-btn biz-btn--soft disabled:opacity-60">
              {exportStatus === "downloading" ? "Exporting..." : "Export CSV"}
            </button>
            <button type="button" className="biz-btn biz-btn--soft" onClick={() => setSearchText("")}>
              Clear Search
            </button>
          </div>
          {exportMessage ? <p className="mt-2 text-sm text-slate-600">{exportMessage}</p> : null}
        </section>

        {status === "loading-auth" || status === "loading-data" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="loading" title="Loading Team Analytics" message="Preparing longitudinal team performance metrics..." />
          </div>
        ) : null}

        {status === "error" ? (
          <div className="biz-sessions-block">
            <BusinessStatePanel tone="error" title="Unable To Load Team Analytics" message={message ?? "Unable to load team analytics."} />
          </div>
        ) : null}

        {status === "ready" ? (
          <section className="biz-sessions-block">
            <h2 className="text-lg font-semibold text-slate-900">Team Directory</h2>
            {filteredRows.length === 0 ? (
              <div className="mt-3">
                <BusinessStatePanel tone="empty" title="No Team History Found" message="Adjust search or run more sessions to populate longitudinal team records." />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="biz-data-table biz-sessions-table min-w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Team Member</th>
                      <th className="px-3 py-2">Organisation</th>
                      <th className="px-3 py-2">Sessions Played</th>
                      <th className="px-3 py-2">Latest Accuracy</th>
                      <th className="px-3 py-2">Latest Session</th>
                      <th className="px-3 py-2">Trend</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.staffKey} className="text-slate-700">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{row.displayName}</td>
                        <td className="px-3 py-2">{orgLabel(row.orgName)}</td>
                        <td className="px-3 py-2">{row.sessionsPlayed.toLocaleString()}</td>
                        <td className="px-3 py-2">{formatPercent(row.latestAccuracyRatio)}</td>
                        <td className="px-3 py-2">{row.latestSessionName ?? "--"}</td>
                        <td className="px-3 py-2">
                          <span className={trendPillClass(row.trendIndicator)}>{trendLabel(row.trendIndicator)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Link className="font-medium text-blue-700 hover:text-blue-900" href={`/business/teams/${encodeURIComponent(row.staffKey)}`}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </section>
    </div>
  );
}

