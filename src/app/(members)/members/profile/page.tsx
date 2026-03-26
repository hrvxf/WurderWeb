import ProfileForm from "@/components/members/ProfileForm";
import { readInitialMemberProfile } from "@/lib/auth/member-initial.server";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

export default async function MembersProfilePage() {
  const { uid } = await requireMemberAccess({
    nextPath: AUTH_ROUTES.membersProfile,
    requireCompleteProfile: true,
  });
  const initialProfile = await readInitialMemberProfile(uid);

  return (
    <div>
      <ProfileForm initialProfile={initialProfile} />
    </div>
  );
}
