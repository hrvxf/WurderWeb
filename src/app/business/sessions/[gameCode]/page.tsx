import BusinessSessionDashboardPage from "@/components/business/dashboard/BusinessSessionDashboardPage";

type BusinessSessionDashboardRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function BusinessSessionDashboardRoute({
  params,
}: BusinessSessionDashboardRouteProps) {
  const { gameCode } = await params;
  return <BusinessSessionDashboardPage gameCode={gameCode} />;
}
