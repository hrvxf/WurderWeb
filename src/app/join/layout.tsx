import type { ReactNode } from "react";

import WorkspaceFrame from "@/components/shell/WorkspaceFrame";

export default function JoinLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceFrame
      tone="personal"
      label="Personal Workspace"
      title="Join and start personal sessions"
      description="Fast personal play with clear join and start-session actions."
    >
      {children}
    </WorkspaceFrame>
  );
}
