import MembersHostClient from "@/components/members/MembersHostClient";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersHostPage() {
  await requireMemberAccess({
    nextPath: AUTH_ROUTES.membersHost,
    requireCompleteProfile: true,
  });
  return <MembersHostClient />;
}
