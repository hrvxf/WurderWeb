"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";

type AdminSessionState =
  | { status: "loading" }
  | { status: "authorized"; email: string | null; uid: string }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };

type AdminCheckStatus = "healthy" | "warning" | "blocking";

type GamePayload = {
  gameCode: string;
  overview: {
    mode: string | null;
    phase: string | null;
    host: string | null;
    aliveCount: number | null;
    activeRosterCount: number;
    startedAt: string | null;
    endedAt: string | null;
    aliveCountFromRoster: number;
    healthBadge: AdminCheckStatus;
    health: {
      needsRepair: boolean;
      repairSeverity: "warning" | "blocking" | null;
      repairReasonCode: string | null;
      repairMessage: string | null;
      repairDetectedAt: string | null;
      repairDetectedBy: string | null;
    };
  };
  players: Array<{
    id: string;
    name: string;
    alive: boolean | null;
    removedAt: string | null;
    lockState: string | null;
    activeClaimId: string | null;
    guildId: string | null;
    classicPoints: number | null;
    warnings: string[];
  }>;
  claims: Array<{
    id: string;
    killer: string | null;
    victim: string | null;
    status: string | null;
    createdAt: string | null;
    expiresAt: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
    claimedWord: string | null;
    notes: string | null;
    isTerminal: boolean;
  }>;
  timeline: Array<{
    id: string;
    timestamp: string | null;
    eventType: string | null;
    actor: string | null;
    summary: string | null;
    result: string | null;
    reasonCode: string | null;
  }>;
  sensitiveFieldsVisible: boolean;
};

type DiagnosticsPayload = {
  status: AdminCheckStatus;
  checks: Array<{
    key: string;
    label: string;
    status: AdminCheckStatus;
    reasonCodes: string[];
    message: string;
  }>;
  summary: string;
  reasonCodes: string[];
  repairRecommendations: string[];
};

const tabs = ["Overview", "Players", "Claims", "Timeline", "Diagnostics"] as const;
type Tab = (typeof tabs)[number];

async function authorizedAdminRequest(path: string, token: string, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function Badge({ status }: { status: AdminCheckStatus }) {
  const cls =
    status === "healthy"
      ? "bg-emerald-600/25 text-emerald-200"
      : status === "warning"
        ? "bg-amber-600/25 text-amber-200"
        : "bg-red-600/25 text-red-200";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${cls}`}>{status}</span>;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [session, setSession] = useState<AdminSessionState>({ status: "loading" });
  const [gameCode, setGameCode] = useState("");
  const [loadedCode, setLoadedCode] = useState<string | null>(null);
  const [game, setGame] = useState<GamePayload | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [statusLine, setStatusLine] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const verifyAdminSession = useCallback(async () => {
    if (!user) return;

    setSession({ status: "loading" });
    const token = await user.getIdToken();
    const { response, payload } = await authorizedAdminRequest("/api/admin/session", token);

    if (response.ok) {
      setSession({ status: "authorized", uid: String(payload.uid ?? ""), email: payload.email ?? null });
      return;
    }

    if (response.status === 403) {
      setSession({ status: "forbidden", message: payload.message ?? "Your account is not on the system admin allowlist." });
      return;
    }

    setSession({ status: "error", message: payload.message ?? "Unable to validate your admin session." });
  }, [user]);

  useEffect(() => {
    if (loading || !user) return;
    void verifyAdminSession();
  }, [loading, user, verifyAdminSession]);

  const loadGame = useCallback(async () => {
    if (!user || session.status !== "authorized") return;
    const code = gameCode.trim();
    if (!code) return;

    setIsBusy(true);
    setStatusLine("Loading game snapshot...");
    const token = await user.getIdToken();
    const { response, payload } = await authorizedAdminRequest(`/api/admin/games/${code}/snapshot`, token);
    setIsBusy(false);

    if (!response.ok) {
      setStatusLine(payload.message ?? "Failed to load game.");
      return;
    }

    setLoadedCode(code);
    setGame(payload.game as GamePayload);
    setDiagnostics(null);
    setStatusLine(`Loaded game ${code}.`);
  }, [gameCode, session.status, user]);

  const runDiagnostics = useCallback(async () => {
    if (!user || session.status !== "authorized" || !loadedCode) return;

    setIsBusy(true);
    setStatusLine("Running diagnostics...");
    const token = await user.getIdToken();
    const { response, payload } = await authorizedAdminRequest(
      `/api/admin/games/${loadedCode}/diagnostics`,
      token,
      "POST"
    );
    setIsBusy(false);

    if (!response.ok) {
      setStatusLine(payload.message ?? "Diagnostics failed.");
      return;
    }

    setDiagnostics(payload.diagnostics as DiagnosticsPayload);
    setStatusLine("Diagnostics report updated.");
    setActiveTab("Diagnostics");
  }, [loadedCode, session.status, user]);

  const runRepair = useCallback(
    async (action: string) => {
      if (!user || session.status !== "authorized" || !loadedCode) return;
      setIsBusy(true);
      setStatusLine(`Running repair action: ${action}`);
      const token = await user.getIdToken();
      const { response, payload } = await authorizedAdminRequest(
        `/api/admin/games/${loadedCode}/repairs`,
        token,
        "POST",
        { action }
      );

      if (!response.ok) {
        setIsBusy(false);
        setStatusLine(payload.message ?? "Repair action failed.");
        return;
      }

      await loadGame();
      setIsBusy(false);
      setStatusLine(payload.warning ? `Completed with warning: ${payload.warning}` : `Repair action '${action}' completed.`);
    },
    [loadedCode, loadGame, session.status, user]
  );

  const healthStatus = useMemo<AdminCheckStatus>(() => {
    if (diagnostics) return diagnostics.status;
    return game?.overview.healthBadge ?? "healthy";
  }, [diagnostics, game?.overview.healthBadge]);

  if (loading || session.status === "loading") {
    return <div className="glass-surface rounded-3xl p-8 text-soft">Checking system admin access...</div>;
  }

  if (session.status !== "authorized") {
    return (
      <section className="glass-surface rounded-3xl p-8">
        <h1 className="text-2xl font-semibold">System Admin Console</h1>
        <p className="mt-3 text-red-200">{session.message}</p>
      </section>
    );
  }

  return (
    <section className="glass-surface rounded-3xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">System Admin Console</h1>
        <p className="mt-2 text-soft">Signed in as {session.email ?? session.uid}</p>
      </div>

      <div className="rounded-2xl border border-white/20 p-4 space-y-3">
        <h2 className="font-semibold">Game Lookup</h2>
        <div className="flex gap-3">
          <input
            value={gameCode}
            onChange={(event) => setGameCode(event.target.value.toUpperCase())}
            placeholder="Enter game code"
            className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
          />
          <button className="rounded-xl border border-white/30 px-4 py-2" disabled={isBusy} onClick={() => void loadGame()}>
            Open
          </button>
        </div>
      </div>

      {game ? (
        <>
          <div className="flex items-center gap-2">
            <Badge status={healthStatus} />
            <span className="text-sm text-soft">Operational view for {game.gameCode}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`rounded-xl border px-3 py-1 text-sm ${activeTab === tab ? "border-white/60" : "border-white/20"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Overview" ? (
            <div className="grid gap-2 text-sm">
              <p>Game code: {game.gameCode}</p>
              <p>Mode: {game.overview.mode ?? "--"}</p>
              <p>Phase: {game.overview.phase ?? "--"}</p>
              <p>Host: {game.overview.host ?? "--"}</p>
              <p>aliveCount: {String(game.overview.aliveCount ?? "--")}</p>
              <p>Active roster count: {game.overview.activeRosterCount}</p>
              <p>Started: {game.overview.startedAt ?? "--"}</p>
              <p>Ended: {game.overview.endedAt ?? "--"}</p>
              <p>Health reason: {game.overview.health.repairReasonCode ?? "--"}</p>
            </div>
          ) : null}

          {activeTab === "Players" ? (
            <div className="space-y-2">
              {game.players.map((player) => (
                <div key={player.id} className="rounded-xl border border-white/20 p-3 text-sm">
                  <p className="font-semibold">{player.name}</p>
                  <p>alive: {String(player.alive)}</p>
                  <p>removedAt: {player.removedAt ?? "--"}</p>
                  <p>lockState: {player.lockState ?? "--"}</p>
                  <p>activeClaimId: {player.activeClaimId ?? "--"}</p>
                  <p>guildId: {player.guildId ?? "--"}</p>
                  <p>classic points: {String(player.classicPoints ?? "--")}</p>
                  <p>warnings: {player.warnings.join(", ") || "none"}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "Claims" ? (
            <div className="space-y-2">
              {game.claims.map((claim) => (
                <div key={claim.id} className="rounded-xl border border-white/20 p-3 text-sm">
                  <p>{claim.killer ?? "?"} {"->"} {claim.victim ?? "?"}</p>
                  <p>status: {claim.status ?? "--"}</p>
                  <p>created: {claim.createdAt ?? "--"}</p>
                  <p>expires: {claim.expiresAt ?? "--"}</p>
                  <p>resolved: {claim.resolvedAt ?? "--"} by {claim.resolvedBy ?? "--"}</p>
                  {game.sensitiveFieldsVisible ? <p>claimedWord: {claim.claimedWord ?? "--"}</p> : null}
                  {game.sensitiveFieldsVisible ? <p>notes: {claim.notes ?? "--"}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "Timeline" ? (
            <div className="space-y-2">
              {game.timeline.map((event) => (
                <div key={event.id} className="rounded-xl border border-white/20 p-3 text-sm">
                  <p>{event.timestamp ?? "--"} - {event.eventType ?? "EVENT"}</p>
                  <p>actor: {event.actor ?? "--"}</p>
                  <p>summary: {event.summary ?? "--"}</p>
                  <p>result: {event.result ?? "--"}</p>
                  <p>reasonCode: {event.reasonCode ?? "--"}</p>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "Diagnostics" ? (
            <div className="space-y-3">
              <button className="rounded-xl border border-white/30 px-4 py-2" disabled={isBusy} onClick={() => void runDiagnostics()}>
                Run diagnostics
              </button>
              {diagnostics ? (
                <>
                  <p className="text-sm">{diagnostics.summary}</p>
                  {diagnostics.checks.map((check) => (
                    <div key={check.key} className="rounded-xl border border-white/20 p-3 text-sm">
                      <div className="flex items-center gap-2"><Badge status={check.status} /><span>{check.label}</span></div>
                      <p>{check.message}</p>
                      <p>reason codes: {check.reasonCodes.join(", ") || "none"}</p>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-soft">No diagnostics report loaded yet.</p>
              )}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/20 p-4 space-y-2">
            <h3 className="font-semibold">Repair Actions</h3>
            <p className="text-xs text-soft">Backend-owned actions only. Unsafe cases are refused by reason code.</p>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-white/30 px-3 py-1 text-sm" onClick={() => void runRepair("recomputeAliveCount")}>Recompute aliveCount</button>
              <button className="rounded-xl border border-white/30 px-3 py-1 text-sm" onClick={() => void runRepair("reissueContract")}>Reissue contract</button>
              <button className="rounded-xl border border-white/30 px-3 py-1 text-sm" onClick={() => void runRepair("markNeedsRepair")}>Mark needsRepair</button>
              <button className="rounded-xl border border-white/30 px-3 py-1 text-sm" onClick={() => void runRepair("clearNeedsRepair")}>Clear needsRepair</button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-soft">Open a game code to inspect a complete operational view.</p>
      )}

      {statusLine ? <p className="text-sm text-soft">{statusLine}</p> : null}
    </section>
  );
}

