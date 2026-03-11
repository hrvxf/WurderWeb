"use client";

import type { ReactNode } from "react";

import AuthGate from "@/components/auth/AuthGate";

export default function ProfileCompletionGuard({ children }: { children: ReactNode }) {
  return <AuthGate requireCompleteProfile>{children}</AuthGate>;
}
