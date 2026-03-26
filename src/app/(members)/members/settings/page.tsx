import MembersSettingsClient from "@/components/members/MembersSettingsClient";
import { readInitialMemberProfile } from "@/lib/auth/member-initial.server";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersSettingsPage() {
  const { uid } = await requireMemberAccess({
    nextPath: AUTH_ROUTES.membersSettings,
    requireCompleteProfile: true,
  });
  const initialProfile = await readInitialMemberProfile(uid);
  return <MembersSettingsClient initialProfile={initialProfile} />;
}
