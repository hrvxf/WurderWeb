import MembersDashboardClient from "@/components/members/MembersDashboardClient";
import { readInitialMemberActiveGameCode } from "@/lib/auth/member-initial.server";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersDashboardPage() {
  const { uid } = await requireMemberAccess({
    nextPath: AUTH_ROUTES.members,
    requireCompleteProfile: true,
  });
  const initialActiveGameCode = await readInitialMemberActiveGameCode(uid);
  return <MembersDashboardClient initialActiveGameCode={initialActiveGameCode} />;
}
