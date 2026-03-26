import { asString, eventLabel, toIso } from "@/domain/manager-dashboard/metrics";
import type { ManagerTimelineEvent } from "@/domain/manager-dashboard/types";

export function shapeTimelineEvents(events: Array<{ id: string; data: Record<string, unknown> }>): ManagerTimelineEvent[] {
  const rows = events.map(({ id, data }) => {
    const type = asString(data.eventType) ?? asString(data.type) ?? "unknown_event";
    const actorId = asString(data.actorId) ?? asString(data.playerId) ?? null;
    const actorName = asString(data.actorName) ?? asString(data.playerName) ?? null;
    const occurredAt =
      toIso(data.occurredAt) ??
      toIso(data.timestamp) ??
      toIso(data.createdAt) ??
      null;

    return {
      id,
      occurredAt,
      type,
      label: eventLabel(type),
      actorId,
      actorName,
      metadata: {
        targetId: asString(data.targetId) ?? asString(data.victimId) ?? null,
        targetName: asString(data.targetName) ?? asString(data.victimName) ?? null,
        result: asString(data.result) ?? null,
      },
    } satisfies ManagerTimelineEvent;
  });

  return rows.sort((left, right) => {
    const leftMs = left.occurredAt ? new Date(left.occurredAt).getTime() : Number.NaN;
    const rightMs = right.occurredAt ? new Date(right.occurredAt).getTime() : Number.NaN;
    const leftValid = Number.isFinite(leftMs);
    const rightValid = Number.isFinite(rightMs);
    if (leftValid && rightValid) return leftMs - rightMs;
    if (leftValid) return -1;
    if (rightValid) return 1;
    return 0;
  });
}
