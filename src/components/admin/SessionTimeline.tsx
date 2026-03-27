"use client";

import { useEffect, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

import { app } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

type SessionTimelineProps = {
  gameCode: string;
};

type TimelineEvent = {
  id: string;
  timestamp: string | null;
  message: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown): string | null {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
}

function parseTimeline(value: unknown): TimelineEvent[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const event = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const timestamp = asNullableString(event.timestamp) ?? asNullableString(event.occurredAt) ?? asNullableString(event.createdAt);
      const actor = asNullableString(event.actor) ?? asNullableString(event.playerName);
      const target = asNullableString(event.target) ?? asNullableString(event.victim);
      const summary = asNullableString(event.summary);
      const result = asNullableString(event.result);
      const eventType = asNullableString(event.eventType);

      let message = summary;
      if (!message && actor && target) {
        message = `${actor} claimed ${target}`;
      }
      if (!message && actor && result) {
        message = `${actor} ${result.toLowerCase()}`;
      }
      if (!message && result) {
        message = result;
      }
      if (!message && eventType) {
        message = eventType
          .toLowerCase()
          .split("_")
          .filter(Boolean)
          .join(" ");
      }

      return {
        id: asString(event.id) || `timeline-${index}`,
        timestamp,
        message: message || "Timeline event",
      } satisfies TimelineEvent;
    })
    .sort((left, right) => {
      const leftMs = left.timestamp ? new Date(left.timestamp).getTime() : Number.NaN;
      const rightMs = right.timestamp ? new Date(right.timestamp).getTime() : Number.NaN;

      const leftValid = Number.isFinite(leftMs);
      const rightValid = Number.isFinite(rightMs);
      if (leftValid && rightValid) return leftMs - rightMs;
      if (leftValid) return -1;
      if (rightValid) return 1;
      return 0;
    });
}

function formatTime(value: string | null): string {
  if (!value) return "--";
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return "--";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(asDate);
}

export default function SessionTimeline({ gameCode }: SessionTimelineProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const normalizedCode = gameCode.trim();
    if (!user || !normalizedCode) {
      setEvents([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");
        const functions = getFunctions(app);
        const fetchTimeline = httpsCallable(functions, "managerGetSessionTimeline");
        const response = await fetchTimeline({ gameCode: normalizedCode });

        if (cancelled) return;

        const payload = response.data && typeof response.data === "object" ? (response.data as Record<string, unknown>) : {};
        const timeline = parseTimeline(payload.timeline);
        setEvents(timeline);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[manager] Unable to load session timeline", {
            gameCode: normalizedCode,
            error,
          });
        }
        setEvents([]);
        setStatus("error");
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [gameCode, user]);

  const hasEvents = useMemo(() => events.length > 0, [events]);

  return (
    <section className="surface-light p-4">
      <h2 className="text-lg font-semibold text-slate-900">Session Timeline</h2>

      {status === "loading" ? <p className="mt-3 text-sm text-slate-600">Loading timeline...</p> : null}
      {status === "error" ? <p className="mt-3 text-sm text-red-700">Unable to load timeline right now.</p> : null}
      {status === "ready" && !hasEvents ? <p className="mt-3 text-sm text-slate-600">No timeline events yet.</p> : null}

      {hasEvents ? (
        <ol className="mt-4 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="grid grid-cols-[72px_1fr] gap-3 text-sm text-slate-700">
              <span className="font-medium tabular-nums text-slate-500">{formatTime(event.timestamp)}</span>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">{event.message}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
