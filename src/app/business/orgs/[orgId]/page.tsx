import OrganizationDashboardPage from "@/components/admin/OrganizationDashboardPage";

type BusinessOrganizationRouteProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function BusinessOrganizationRoute({
  params,
}: BusinessOrganizationRouteProps) {
  const { orgId } = await params;
  return <OrganizationDashboardPage orgId={orgId} />;
}
