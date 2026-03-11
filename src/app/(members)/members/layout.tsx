import type { ReactNode } from "react";

import AuthGate from "@/components/auth/AuthGate";
import MemberShell from "@/components/members/MemberShell";

export default function MembersLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <MemberShell>{children}</MemberShell>
    </AuthGate>
  );
}
