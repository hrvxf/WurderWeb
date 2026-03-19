"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import GameOverviewPanel from "@/components/admin/GameOverviewPanel";
import InsightCards from "@/components/admin/InsightCards";
import PlayerPerformanceTable from "@/components/admin/PlayerPerformanceTable";
import SessionSummary from "@/components/admin/SessionSummary";
import type {
  ManagerAnalyticsDocument,
  ManagerGameOverview,
  ManagerInsight,
  ManagerPlayerPerformance,
  ManagerSessionSummary,
} from "@/components/admin/types";
import { db } from "@/lib/firebase/client";

type ManagerDashboardPageProps = {
  gameCode: string;
};

function parseNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeOverview(value: unknown, gameCode: string): ManagerGameOverview {
  const overview = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    gameCode,
    gameName: parseString(overview.gameName),
    status: parseString(overview.status) || "unknown",
    startedAt: parseNullableString(overview.startedAt),
    endedAt: parseNullableString(overview.endedAt),
    totalPlayers: parseNumber(overview.totalPlayers),
    activePlayers: parseNumber(overview.activePlayers),
    totalSessions: parseNumber(overview.totalSessions),
  };
}

function normalizeInsights(value: unknown): ManagerInsight[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const insight = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        label: parseString(insight.label),
        value: parseNumber(insight.value),
      };
    })
    .filter((item) => item.label.length > 0);
}

function normalizePlayers(value: unknown): ManagerPlayerPerformance[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const player = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      playerId: parseString(player.playerId) || `row-${index}`,
      displayName: parseString(player.displayName) || "Unknown",
      kills: parseNumber(player.kills),
      deaths: parseNumber(player.deaths),
      kdRatio: parseNumber(player.kdRatio),
      accuracyPct: parseNumber(player.accuracyPct),
      sessionCount: parseNumber(player.sessionCount),
    };
  });
}

function normalizeSessionSummary(value: unknown): ManagerSessionSummary {
  const summary = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    totalSessions: parseNumber(summary.totalSessions),
    avgSessionLengthSeconds: parseNumber(summary.avgSessionLengthSeconds),
    longestSessionSeconds: parseNumber(summary.longestSessionSeconds),
    lastSessionAt: parseNullableString(summary.lastSessionAt),
  };
}

function normalizeAnalytics(value: unknown, gameCode: string): ManagerAnalyticsDocument {
  const analytics = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    overview: normalizeOverview(analytics.overview, gameCode),
    insights: normalizeInsights(analytics.insights),
    playerPerformance: normalizePlayers(analytics.playerPerformance),
    sessionSummary: normalizeSessionSummary(analytics.sessionSummary),
    updatedAt: parseNullableString(analytics.updatedAt),
  };
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "—";

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(asDate);
}

export default function ManagerDashboardPage({ gameCode }: ManagerDashboardPageProps) {
  const [analytics, setAnalytics] = useState<ManagerAnalyticsDocument | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    const normalizedCode = gameCode.trim();
    if (!normalizedCode) {
      setStatus("missing");
      setAnalytics(null);
      return;
    }

    setStatus("loading");

    const analyticsRef = doc(db, "gameAnalytics", normalizedCode);
    const unsubscribe = onSnapshot(
      analyticsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setStatus("missing");
          setAnalytics(null);
          return;
        }

        setAnalytics(normalizeAnalytics(snapshot.data(), normalizedCode));
        setStatus("ready");
      },
      () => {
        setStatus("error");
        setAnalytics(null);
      }
    );

    return () => unsubscribe();
  }, [gameCode]);

  const updatedAtLabel = useMemo(() => formatUpdatedAt(analytics?.updatedAt ?? null), [analytics?.updatedAt]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Manager Dashboard V2</h1>
            <p className="text-sm text-slate-600">Game code: {gameCode || "—"}</p>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Updated: {updatedAtLabel}</p>
        </div>
      </header>

      {status === "loading" && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading aggregated analytics...
        </section>
      )}

      {status === "missing" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 shadow-sm">
          Aggregated analytics were not found for this game.
        </section>
      )}

      {status === "error" && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-sm">
          Unable to load dashboard analytics right now.
        </section>
      )}

      {status === "ready" && analytics ? (
        <div className="grid gap-6">
          <GameOverviewPanel overview={analytics.overview} />
          <InsightCards insights={analytics.insights} />
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <PlayerPerformanceTable players={analytics.playerPerformance} />
            <SessionSummary summary={analytics.sessionSummary} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
