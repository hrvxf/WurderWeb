import BusinessStaffSettingsPage from "@/components/business/staff/BusinessStaffSettingsPage";

type BusinessTeamMemberSettingsRouteProps = {
  params: Promise<{
    staffKey: string;
  }>;
};

export default async function BusinessTeamMemberSettingsRoute({ params }: BusinessTeamMemberSettingsRouteProps) {
  const { staffKey } = await params;
  return <BusinessStaffSettingsPage staffKey={staffKey} />;
}

