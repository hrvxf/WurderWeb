import ManagerDashboardPage from "@/components/admin/ManagerDashboardPage";

type BusinessSessionDashboardRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function BusinessSessionDashboardRoute({
  params,
}: BusinessSessionDashboardRouteProps) {
  const { gameCode } = await params;
  return <ManagerDashboardPage gameCode={gameCode} />;
}
