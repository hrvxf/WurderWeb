import ManagerComparePage from "@/components/admin/dashboard/ManagerComparePage";

type BusinessSessionCompareRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function BusinessSessionCompareRoute({
  params,
}: BusinessSessionCompareRouteProps) {
  const { gameCode } = await params;
  return <ManagerComparePage gameCode={gameCode} />;
}
