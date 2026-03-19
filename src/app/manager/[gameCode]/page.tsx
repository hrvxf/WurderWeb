import ManagerDashboardPage from "@/components/admin/ManagerDashboardPage";

type ManagerDashboardRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function ManagerGameDashboardRoute({ params }: ManagerDashboardRouteProps) {
  const { gameCode } = await params;

  return <ManagerDashboardPage gameCode={gameCode} />;
}
