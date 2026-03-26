"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthProvider";

type ComparePreset = { id: "highRisk" | "highDispute" | "lowAccuracy"; label: string };
type ComparePlayer = {
  playerId: string;
  displayName: string;
  avatarUrl: string | null;
  games: number;
  kills: number;
  deaths: number;
  avgKdRatio: number | null;
  avgAccuracyRatio: number | null;
  avgDisputeRateRatio: number | null;
};

type CompareTrendPoint = {
  index: number;
  gameCode: string;
  updatedAt: string | null;
  totalKills: number;
  totalDeaths: number;
  disputeRateRatio: number | null;
};

type ComparePayload = {
  gameCode: string;
  thresholds: {
    disputeRateWarningRatio: number;
    disputeRateLabel: string | null;
  };
  presets: ComparePreset[];
  cohorts: Record<ComparePreset["id"], string[]>;
  players: ComparePlayer[];
  aggregateTrend: CompareTrendPoint[];
};

function percent(value: number | null): string {
  if (!Number.isFinite(value ?? Number.NaN)) return "--";
  return `${(((value ?? 0) as number) * 100).toFixed(1)}%`;
}

export default function ManagerComparePage({ gameCode }: { gameCode: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<ComparePayload | null>(null);
  const [activePreset, setActivePreset] = useState<ComparePreset["id"] | "all">("all");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessage(null);
    void (async () => {
      try {
        const token = user ? await user.getIdToken() : null;
        const response = await fetch(`/api/manager/games/${encodeURIComponent(gameCode)}/compare`, {
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        });
        const body = (await response.json().catch(() => ({}))) as ComparePayload & { message?: string };
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          setMessage(body.message ?? "Unable to load compare data.");
          return;
        }
        setPayload(body);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("Unable to load compare data right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameCode, user]);

  const visiblePlayers = useMemo(() => {
    if (!payload) return [];
    if (activePreset === "all") return payload.players;
    const cohortIds = new Set(payload.cohorts[activePreset] ?? []);
    return payload.players.filter((player) => cohortIds.has(player.playerId));
  }, [activePreset, payload]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5 p-3 sm:p-5">
      <header className="rounded-2xl border border-white/15 bg-[linear-gradient(160deg,rgba(8,10,15,0.95),rgba(17,20,29,0.92))] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Manager Compare</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Users & Aggregate Trends Over Time</h1>
        <p className="mt-2 text-sm text-white/70">Game context: {gameCode}</p>
        <div className="mt-3">
          <Link className="text-sm text-white/80 underline underline-offset-4" href={`/manager/${encodeURIComponent(gameCode)}`}>
            Back to dashboard
          </Link>
        </div>
      </header>

      {status === "loading" ? <section className="h-40 animate-pulse rounded-2xl border border-white/15 bg-white/[0.03]" /> : null}
      {status === "error" ? <section className="rounded-2xl border border-red-300/45 bg-red-500/15 p-4 text-sm text-red-100">{message}</section> : null}

      {status === "ready" && payload ? (
        <div className="grid gap-5">
          <section className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-white/60">KPI Threshold</p>
            <p className="mt-1 text-sm text-white/85">
              Dispute warning: {percent(payload.thresholds.disputeRateWarningRatio)} ({payload.thresholds.disputeRateLabel ?? "expected threshold"})
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-md border px-2 py-1 text-xs ${activePreset === "all" ? "border-[var(--manager-accent,#D96A5A)] bg-[var(--manager-accent,#D96A5A)] text-white" : "border-white/20 text-white/80"}`}
                onClick={() => setActivePreset("all")}
              >
                All
              </button>
              {payload.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`rounded-md border px-2 py-1 text-xs ${
                    activePreset === preset.id ? "border-[var(--manager-accent,#D96A5A)] bg-[var(--manager-accent,#D96A5A)] text-white" : "border-white/20 text-white/80"
                  }`}
                  onClick={() => setActivePreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
            <h2 className="text-base font-semibold text-white">Player Cohorts</h2>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm text-white/85">
                <thead className="text-left text-xs uppercase tracking-[0.12em] text-white/60">
                  <tr>
                    <th className="py-2">Player</th>
                    <th>Games</th>
                    <th>Kills</th>
                    <th>Deaths</th>
                    <th>Avg K/D</th>
                    <th>Avg Accuracy</th>
                    <th>Avg Dispute</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((player) => (
                    <tr key={player.playerId} className="border-t border-white/10">
                      <td className="py-2">
                        <Link className="hover:underline" href={`/manager/${encodeURIComponent(gameCode)}/players/${encodeURIComponent(player.playerId)}`}>
                          {player.displayName}
                        </Link>
                      </td>
                      <td>{player.games}</td>
                      <td>{player.kills}</td>
                      <td>{player.deaths}</td>
                      <td>{player.avgKdRatio == null ? "--" : player.avgKdRatio.toFixed(2)}</td>
                      <td>{percent(player.avgAccuracyRatio)}</td>
                      <td>{percent(player.avgDisputeRateRatio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
            <h2 className="text-base font-semibold text-white">Aggregate Game Trend</h2>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm text-white/85">
                <thead className="text-left text-xs uppercase tracking-[0.12em] text-white/60">
                  <tr>
                    <th className="py-2">Game</th>
                    <th>Updated</th>
                    <th>Kills</th>
                    <th>Deaths</th>
                    <th>Dispute Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.aggregateTrend.map((point) => (
                    <tr key={`${point.gameCode}-${point.index}`} className="border-t border-white/10">
                      <td className="py-2">{point.gameCode}</td>
                      <td>{point.updatedAt ? new Date(point.updatedAt).toLocaleString() : "--"}</td>
                      <td>{point.totalKills}</td>
                      <td>{point.totalDeaths}</td>
                      <td>{percent(point.disputeRateRatio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
