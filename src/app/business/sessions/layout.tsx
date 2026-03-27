import type { ReactNode } from "react";

import AuthGate from "@/components/auth/AuthGate";

export default function BusinessSessionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
