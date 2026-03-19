import OrganizationDashboardPage from "@/components/admin/OrganizationDashboardPage";

type OrganizationDashboardRouteProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function OrganizationDashboardRoute({ params }: OrganizationDashboardRouteProps) {
  const { orgId } = await params;

  return <OrganizationDashboardPage orgId={orgId} />;
}
