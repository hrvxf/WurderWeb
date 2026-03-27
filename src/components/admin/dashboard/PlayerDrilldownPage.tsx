"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { ManagerPlayerPerformance, ManagerTimelineEntry } from "@/components/admin/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { businessSessionCompareRoute, businessSessionRoute } from "@/lib/business/routes";

type PlayerHistoryRow = {
  gameCode: string;
  updatedAt: string | null;
  kills: number;
  deaths: number;
  kdRatio: number | null;
  accuracyRatio: number | null;
  disputeRateRatio: number | null;
  claimsSubmitted: number;
  claimsConfirmed: number;
  claimsDenied: number;
  sessionCount: number;
};

type PlayerPayload = {
  gameCode: string;
  player: ManagerPlayerPerformance;
  history: PlayerHistoryRow[];
  claimTimeline: ManagerTimelineEntry[];
  coachingNotes: {
    notes: string;
    updatedAt: string | null;
  };
};

function percent(value: number | null): string {
  if (!Number.isFinite(value ?? Number.NaN)) return "--";
  return `${(((value ?? 0) as number) * 100).toFixed(1)}%`;
}

export default function PlayerDrilldownPage({ gameCode, playerId }: { gameCode: string; playerId: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [payload, setPayload] = useState<PlayerPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessage(null);
    void (async () => {
      try {
        const token = user ? await user.getIdToken() : null;
        const response = await fetch(
          `/api/manager/games/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(playerId)}`,
          {
            headers: token ? { authorization: `Bearer ${token}` } : undefined,
          }
        );
        const body = (await response.json().catch(() => ({}))) as PlayerPayload & { message?: string };
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(body.message ?? "Unable to load player drill-down.");
          return;
        }
        setPayload(body);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Unable to load player drill-down right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameCode, playerId, user]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5 p-3 sm:p-5">
      <header className="surface-light p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Business Session Player Drill-Down</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{decodeURIComponent(playerId)}</h1>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link className="text-sm text-slate-700 underline underline-offset-4 hover:text-slate-900" href={businessSessionRoute(gameCode)}>
            Back to dashboard
          </Link>
          <Link className="text-sm text-slate-700 underline underline-offset-4 hover:text-slate-900" href={businessSessionCompareRoute(gameCode)}>
            Compare users
          </Link>
        </div>
      </header>

      {status === "loading" ? <section className="h-32 animate-pulse surface-light" /> : null}
      {status === "error" ? <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</section> : null}

      {status === "ready" && payload ? (
        <div className="grid gap-5">
          <section className="surface-light p-4">
            <h2 className="text-base font-semibold text-slate-900">Current Metrics</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <p className="text-sm text-slate-700">Kills: {payload.player.kills ?? "--"}</p>
              <p className="text-sm text-slate-700">Deaths: {payload.player.deaths ?? "--"}</p>
              <p className="text-sm text-slate-700">K/D: {payload.player.kdRatio == null ? "--" : payload.player.kdRatio.toFixed(2)}</p>
              <p className="text-sm text-slate-700">Accuracy: {percent(payload.player.accuracyRatio)}</p>
              <p className="text-sm text-slate-700">Dispute: {percent(payload.player.disputeRateRatio)}</p>
              <p className="text-sm text-slate-700">Sessions: {payload.player.sessionCount ?? "--"}</p>
            </div>
          </section>

          <section className="surface-light p-4">
            <h2 className="text-base font-semibold text-slate-900">History</h2>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm text-slate-700">
                <thead className="text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="py-2">Game</th>
                    <th>Updated</th>
                    <th>Kills</th>
                    <th>Deaths</th>
                    <th>K/D</th>
                    <th>Accuracy</th>
                    <th>Dispute</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.history.map((row) => (
                    <tr key={`${row.gameCode}-${row.updatedAt ?? "na"}`} className="border-t border-slate-200">
                      <td className="py-2">{row.gameCode}</td>
                      <td>{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "--"}</td>
                      <td>{row.kills}</td>
                      <td>{row.deaths}</td>
                      <td>{row.kdRatio == null ? "--" : row.kdRatio.toFixed(2)}</td>
                      <td>{percent(row.accuracyRatio)}</td>
                      <td>{percent(row.disputeRateRatio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="surface-light p-4">
            <h2 className="text-base font-semibold text-slate-900">Claim Timeline (Current Game)</h2>
            <div className="mt-3 space-y-2">
              {payload.claimTimeline.length === 0 ? (
                <p className="text-sm text-slate-600">No player-linked timeline events found.</p>
              ) : (
                payload.claimTimeline.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <p>{event.label}</p>
                    <p className="text-xs text-slate-500">{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : "--"}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="surface-light p-4">
            <h2 className="text-base font-semibold text-slate-900">Coaching Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{payload.coachingNotes.notes || "No coaching notes available yet."}</p>
            <p className="mt-2 text-xs text-slate-500">Last updated: {payload.coachingNotes.updatedAt ? new Date(payload.coachingNotes.updatedAt).toLocaleString() : "--"}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
