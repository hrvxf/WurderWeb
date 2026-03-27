import BusinessSessionComparePage from "@/components/business/dashboard/BusinessSessionComparePage";

type BusinessSessionCompareRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function BusinessSessionCompareRoute({
  params,
}: BusinessSessionCompareRouteProps) {
  const { gameCode } = await params;
  return <BusinessSessionComparePage gameCode={gameCode} />;
}
