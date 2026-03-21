"use client";

import ProfileCompletionGuard from "@/components/auth/ProfileCompletionGuard";
import StatsPanel from "@/components/members/StatsPanel";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function MembersStatsPage() {
  const { stats } = useAuth();

  return (
    <ProfileCompletionGuard>
      <StatsPanel stats={stats} />
    </ProfileCompletionGuard>
  );
}
