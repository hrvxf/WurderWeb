import MembersDashboardClient from "@/components/members/MembersDashboardClient";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersDashboardPage() {
  await requireMemberAccess({
    nextPath: AUTH_ROUTES.members,
    requireCompleteProfile: true,
  });
  return <MembersDashboardClient />;
}
