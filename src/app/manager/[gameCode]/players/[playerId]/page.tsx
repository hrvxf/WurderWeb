import PlayerDrilldownPage from "@/components/admin/dashboard/PlayerDrilldownPage";

type PlayerRouteProps = {
  params: Promise<{
    gameCode: string;
    playerId: string;
  }>;
};

export default async function ManagerPlayerDrilldownRoute({ params }: PlayerRouteProps) {
  const { gameCode, playerId } = await params;
  return <PlayerDrilldownPage gameCode={gameCode} playerId={playerId} />;
}
