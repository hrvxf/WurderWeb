import { redirect } from "next/navigation";

type BusinessStaffDetailRouteProps = {
  params: Promise<{
    staffKey: string;
  }>;
};

export default async function BusinessStaffDetailRoute({ params }: BusinessStaffDetailRouteProps) {
  const { staffKey } = await params;
  redirect(`/business/teams/${encodeURIComponent(staffKey)}`);
}
