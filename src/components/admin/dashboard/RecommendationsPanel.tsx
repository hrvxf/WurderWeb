import ManagerRecommendations from "@/components/admin/ManagerRecommendations";
import type { ManagerRecommendation } from "@/components/admin/types";

type RecommendationsPanelProps = {
  recommendations: ManagerRecommendation[];
};

export default function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  return <ManagerRecommendations recommendations={recommendations} />;
}
