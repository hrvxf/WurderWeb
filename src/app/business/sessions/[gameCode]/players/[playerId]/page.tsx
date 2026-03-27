import BusinessSessionPlayerDrilldownPage from "@/components/business/dashboard/BusinessSessionPlayerDrilldownPage";

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
  return <BusinessSessionPlayerDrilldownPage gameCode={gameCode} playerId={playerId} />;
}
