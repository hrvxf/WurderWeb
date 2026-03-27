import type { ReactNode } from "react";

import WorkspaceFrame from "@/components/shell/WorkspaceFrame";

export default function MembersHostLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WorkspaceFrame
      tone="personal"
      label="Personal Host Workspace"
      title="Manage your hosted personal sessions"
      description="Track personal host activity and quickly return to active or recent sessions."
    >
      {children}
    </WorkspaceFrame>
  );
}
