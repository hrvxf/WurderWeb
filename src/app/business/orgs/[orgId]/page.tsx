import BusinessOrganizationDashboardPage from "@/components/business/dashboard/BusinessOrganizationDashboardPage";

type BusinessOrganizationRouteProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function BusinessOrganizationRoute({
  params,
}: BusinessOrganizationRouteProps) {
  const { orgId } = await params;
  return <BusinessOrganizationDashboardPage orgId={orgId} />;
}
