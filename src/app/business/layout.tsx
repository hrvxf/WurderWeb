import type { ReactNode } from "react";

import WorkspaceFrame from "@/components/shell/WorkspaceFrame";

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceFrame
      tone="business"
      label="Business Workspace"
      title="Run structured sessions and reporting"
      description="Plan sessions, monitor outcomes, and review performance in a focused operations workspace."
    >
      {children}
    </WorkspaceFrame>
  );
}
