"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthProvider";
import { businessSessionRoute } from "@/lib/business/routes";

type SessionRow = {
  id: string;
  title: string;
  orgId: string | null;
  createdAt: string | null;
  endedAt: string | null;
  recencyMs: number;
};

type SessionsApiPayload = {
  sessions?: Array<{
    gameCode?: unknown;
    sessionName?: unknown;
    orgId?: unknown;
    createdAt?: unknown;
    endedAt?: unknown;
  }>;
};

function isValidGameCode(value: string): boolean {
  return value.trim().length > 0 && !value.startsWith("session-");
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWhen(createdAt: string | null, endedAt: string | null): string {
  const raw = endedAt ?? createdAt;
  if (!raw) return "Date unavailable";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(parsed);
}

type HostPreviousGamesCardProps = {
  initialSessions?: SessionRow[];
};

export default function HostPreviousGamesCard({ initialSessions = [] }: HostPreviousGamesCardProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/members/sessions?limit=8", {
        headers: { authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as SessionsApiPayload;
      if (!response.ok || !Array.isArray(payload.sessions)) {
        setLoadError("Could not refresh session history right now. Showing your last available sessions.");
        return;
      }

      const normalized = payload.sessions
        .map((entry, index): SessionRow | null => {
          const id = asString(entry.gameCode) ?? `session-${index}`;
          const title = asString(entry.sessionName) ?? id;
          const orgId = asString(entry.orgId);
          const createdAt = asString(entry.createdAt);
          const endedAt = asString(entry.endedAt);
          const recencyMs = Math.max(parseDateMs(createdAt), parseDateMs(endedAt));
          return { id, title, orgId, createdAt, endedAt, recencyMs };
        })
        .filter((entry): entry is SessionRow => Boolean(entry))
        .sort((a, b) => b.recencyMs - a.recencyMs);

      setSessions(normalized);
    } catch {
      setLoadError("Could not refresh session history right now. Showing your last available sessions.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadSessions();
  }, [loadSessions, user]);

  const topSessions = useMemo(() => sessions.slice(0, 5), [sessions]);

  return (
    <section className="border-t border-white/10 pt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Session history</p>
          <h3 className="mt-1.5 text-lg font-semibold">Previous Games</h3>
        </div>
        <Link
          href="/members/stats"
          className="text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
        >
          View all
        </Link>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-white/70">Loading sessions...</p>
      ) : null}
      {loadError ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-100/90">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadSessions()}
            disabled={loading}
            className="rounded-md border border-amber-300/35 bg-transparent px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-50 transition hover:bg-amber-400/10 disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !loadError && topSessions.length === 0 ? (
        <div className="mt-4 border-y border-white/10 py-3">
          <p className="text-sm text-white/70">No previous games yet.</p>
        </div>
      ) : null}

      {topSessions.length > 0 ? (
        <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {topSessions.map((session) => (
            <li key={session.id} className="px-0 py-2.5">
              {isValidGameCode(session.id) ? (
                <Link
                  href={
                    session.orgId
                      ? businessSessionRoute(session.id)
                      : `/join/${encodeURIComponent(session.id)}`
                  }
                  className="block"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{session.title}</p>
                    <span className="rounded-full border border-white/20 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                      {session.orgId ? "Business" : "Personal"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">{formatWhen(session.createdAt, session.endedAt)}</p>
                </Link>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{session.title}</p>
                    <span className="rounded-full border border-white/20 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                      {session.orgId ? "Business" : "Personal"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">{formatWhen(session.createdAt, session.endedAt)}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
