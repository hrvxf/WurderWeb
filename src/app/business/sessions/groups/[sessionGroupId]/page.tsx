import BusinessSessionGroupPage from "@/components/business/sessions/BusinessSessionGroupPage";

type BusinessSessionGroupRouteProps = {
  params: Promise<{
    sessionGroupId: string;
  }>;
};

export default async function BusinessSessionGroupRoute({ params }: BusinessSessionGroupRouteProps) {
  const { sessionGroupId } = await params;
  return <BusinessSessionGroupPage sessionGroupId={sessionGroupId} />;
}
