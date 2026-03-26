import SessionTimeline from "@/components/admin/SessionTimeline";
import type { ManagerTimelineEntry } from "@/components/admin/types";

type TimelinePanelProps = {
  timeline: ManagerTimelineEntry[] | undefined;
  isLocked: boolean;
  lockedMessage: string;
};

export default function TimelinePanel({ timeline, isLocked, lockedMessage }: TimelinePanelProps) {
  return <SessionTimeline timeline={timeline} isLocked={isLocked} lockedMessage={lockedMessage} />;
}
