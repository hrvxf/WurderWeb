import MembersStatsClient from "@/components/members/MembersStatsClient";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersStatsPage() {
  await requireMemberAccess({
    nextPath: AUTH_ROUTES.membersStats,
    requireCompleteProfile: true,
  });
  return <MembersStatsClient />;
}
