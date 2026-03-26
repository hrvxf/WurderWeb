import type { ManagerTimelineEntry } from "@/components/admin/types";

type TimelinePanelProps = {
  timeline: ManagerTimelineEntry[] | undefined;
  isLocked: boolean;
  lockedMessage: string;
};

export default function TimelinePanel({ timeline, isLocked, lockedMessage }: TimelinePanelProps) {
  if (isLocked) {
    return (
      <section className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
        {lockedMessage}
      </section>
    );
  }

  const rows = Array.isArray(timeline) ? timeline : [];
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-white/12 bg-white/[0.03] p-3 text-sm text-white/70">
        No timeline events available yet.
      </section>
    );
  }

  return (
    <section className="space-y-2">
      {rows.map((event) => (
        <article key={event.id} className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2">
          <p className="text-sm text-white">{event.label}</p>
          <p className="mt-1 text-xs text-white/60">{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : "--"}</p>
        </article>
      ))}
    </section>
  );
}
