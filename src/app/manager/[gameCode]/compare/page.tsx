import { redirect } from "next/navigation";
import { businessSessionCompareRoute } from "@/lib/business/routes";

type CompareRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function LegacyManagerCompareRoute({ params }: CompareRouteProps) {
  const { gameCode } = await params;
  redirect(businessSessionCompareRoute(gameCode));
}
