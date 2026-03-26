import SessionSummary from "@/components/admin/SessionSummary";
import type { ManagerInsight, ManagerOverview, ManagerPlayerPerformance, ManagerSessionSummary } from "@/components/admin/types";

type SessionSummaryPanelProps = {
  summary: ManagerSessionSummary;
  overview: ManagerOverview;
  insights: ManagerInsight[];
  players: ManagerPlayerPerformance[];
};

export default function SessionSummaryPanel({ summary, overview, insights, players }: SessionSummaryPanelProps) {
  return <SessionSummary summary={summary} overview={overview} insights={insights} players={players} />;
}
