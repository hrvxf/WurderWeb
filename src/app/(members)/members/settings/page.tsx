import MembersSettingsClient from "@/components/members/MembersSettingsClient";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersSettingsPage() {
  await requireMemberAccess({
    nextPath: AUTH_ROUTES.membersSettings,
    requireCompleteProfile: true,
  });
  return <MembersSettingsClient />;
}
