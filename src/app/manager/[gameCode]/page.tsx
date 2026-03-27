import { redirect } from "next/navigation";
import { businessSessionRoute } from "@/lib/business/routes";

type ManagerDashboardRouteProps = {
  params: Promise<{
    gameCode: string;
  }>;
};

export default async function LegacyManagerGameDashboardRoute({
  params,
}: ManagerDashboardRouteProps) {
  const { gameCode } = await params;
  redirect(businessSessionRoute(gameCode));
}
