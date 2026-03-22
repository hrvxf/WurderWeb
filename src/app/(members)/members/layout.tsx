import type { ReactNode } from "react";

import MemberShell from "@/components/members/MemberShell";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";
import { requireMemberAccess } from "@/lib/auth/member-server-guard";
import { readMemberShellIdentity } from "@/lib/auth/member-server-profile";

export default async function MembersLayout({ children }: { children: ReactNode }) {
  const { uid } = await requireMemberAccess({ nextPath: AUTH_ROUTES.members });
  const identity = await readMemberShellIdentity(uid);
  return (
    <MemberShell initialDisplayName={identity.displayName} initialWurderId={identity.wurderId}>
      {children}
    </MemberShell>
  );
}
