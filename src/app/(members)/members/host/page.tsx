import MembersHostClient from "@/components/members/MembersHostClient";
import { readInitialMemberSessions } from "@/lib/auth/member-initial.server";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersHostPage() {
  const { uid } = await requireMemberAccess({
    nextPath: AUTH_ROUTES.membersHost,
    requireCompleteProfile: true,
  });
  const initialSessions = await readInitialMemberSessions(uid, 8);
  return <MembersHostClient initialSessions={initialSessions} />;
}
