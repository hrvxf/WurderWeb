import BusinessOrganizationSettingsPage from "@/components/business/dashboard/BusinessOrganizationSettingsPage";

type BusinessOrganizationSettingsRouteProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function BusinessOrganizationSettingsRoute({ params }: BusinessOrganizationSettingsRouteProps) {
  const { orgId } = await params;
  return <BusinessOrganizationSettingsPage orgId={orgId} />;
}

