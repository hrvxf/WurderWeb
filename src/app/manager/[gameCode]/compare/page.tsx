import ManagerComparePage from "@/components/admin/dashboard/ManagerComparePage";

type CompareRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function ManagerCompareRoute({ params }: CompareRouteProps) {
  const { gameCode } = await params;
  return <ManagerComparePage gameCode={gameCode} />;
}
