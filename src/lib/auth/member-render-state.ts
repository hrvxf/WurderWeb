import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";
import type { WurderUserProfile } from "@/lib/types/user";

export type MemberRenderState = {
  profile: WurderUserProfile | null;
  complete: boolean;
  missingFields: Array<"wurderId" | "firstName" | "lastName">;
};

export function resolveMemberRenderState(profile: WurderUserProfile | null): MemberRenderState {
  const completion = getProfileCompletionStatus(profile);
  return {
    profile,
    complete: completion.complete,
    missingFields: completion.missingFields,
  };
}
