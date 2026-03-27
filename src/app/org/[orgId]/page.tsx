import { redirect } from "next/navigation";
import { businessOrgRoute } from "@/lib/business/routes";

type OrganizationDashboardRouteProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function LegacyOrganizationDashboardRoute({
  params,
}: OrganizationDashboardRouteProps) {
  const { orgId } = await params;
  redirect(businessOrgRoute(orgId));
}
