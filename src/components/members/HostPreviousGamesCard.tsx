"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthProvider";

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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/members/sessions?limit=8", {
          headers: { authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as SessionsApiPayload;
        if (!response.ok || !Array.isArray(payload.sessions)) return;

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

        if (!cancelled) {
          setSessions(normalized);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

      {!loading && topSessions.length === 0 ? (
        <div className="mt-4 border-y border-white/10 py-3">
          <p className="text-sm text-white/70">No previous games yet.</p>
        </div>
      ) : null}

      {topSessions.length > 0 ? (
        <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {topSessions.map((session) => (
            <li key={session.id} className="px-0 py-2.5">
              {isValidGameCode(session.id) ? (
                <Link href={`/manager/${encodeURIComponent(session.id)}`} className="block">
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
