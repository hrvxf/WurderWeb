import BusinessStaffDetailPage from "@/components/business/staff/BusinessStaffDetailPage";

type BusinessTeamDetailRouteProps = {
  params: Promise<{
    staffKey: string;
  }>;
};

export default async function BusinessTeamDetailRoute({ params }: BusinessTeamDetailRouteProps) {
  const { staffKey } = await params;
  return <BusinessStaffDetailPage staffKey={staffKey} />;
}
