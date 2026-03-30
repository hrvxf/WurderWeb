import type { ReactNode } from "react";
import Link from "next/link";

import BusinessWorkspaceNav from "@/components/business/BusinessWorkspaceNav";
import WorkspaceFrame from "@/components/shell/WorkspaceFrame";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceFrame
      tone="business"
      label="Business Operations"
      title="Organisation sessions and analytics"
      description="Navigate organisations, session groups, and game analytics from a live manager workflow."
      headerActions={
        <Link href={BUSINESS_ROUTES.createSession} className="workspace-frame__session-cta">
          Start Session
        </Link>
      }
    >
      <BusinessWorkspaceNav />
      {children}
    </WorkspaceFrame>
  );
}
