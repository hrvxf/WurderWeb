import PlayerDrilldownPage from "@/components/admin/dashboard/PlayerDrilldownPage";

type BusinessSessionPlayerRouteProps = {
  params: Promise<{
    gameCode: string;
    playerId: string;
  }>;
};

export default async function BusinessSessionPlayerRoute({
  params,
}: BusinessSessionPlayerRouteProps) {
  const { gameCode, playerId } = await params;
  return <PlayerDrilldownPage gameCode={gameCode} playerId={playerId} />;
}
