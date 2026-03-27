import { redirect } from "next/navigation";
import { businessSessionPlayerRoute } from "@/lib/business/routes";

type PlayerRouteProps = {
  params: Promise<{
    gameCode: string;
    playerId: string;
  }>;
};

export default async function LegacyManagerPlayerDrilldownRoute({
  params,
}: PlayerRouteProps) {
  const { gameCode, playerId } = await params;
  redirect(businessSessionPlayerRoute(gameCode, playerId));
}
