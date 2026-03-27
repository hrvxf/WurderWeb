import type { ReactNode } from "react";

import WorkspaceFrame from "@/components/shell/WorkspaceFrame";

export default function JoinLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceFrame
      tone="personal"
      label="Personal Workspace"
      title="Join and host personal games"
      description="Fast, social session setup for friends and community play."
    >
      {children}
    </WorkspaceFrame>
  );
}
