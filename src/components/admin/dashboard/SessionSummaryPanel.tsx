import SessionSummary from "@/components/admin/SessionSummary";
import type { ManagerSessionSummary } from "@/components/admin/types";

type SessionSummaryPanelProps = {
  summary: ManagerSessionSummary;
};

export default function SessionSummaryPanel({ summary }: SessionSummaryPanelProps) {
  return <SessionSummary summary={summary} />;
}
