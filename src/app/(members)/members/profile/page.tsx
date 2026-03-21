"use client";

import ProfileForm from "@/components/members/ProfileForm";
import { useAuth } from "@/lib/auth/AuthProvider";
import { resolveMemberRenderState } from "@/lib/auth/member-render-state";

export default function MembersProfilePage() {
  const { profile } = useAuth();
  const renderState = resolveMemberRenderState(profile);

  return (
    <div className="space-y-4">
      <div className="glass-surface rounded-3xl p-5">
        <p className="text-sm text-soft">
          {renderState.complete
            ? "Your profile is complete. You can still update name and avatar."
            : "Complete required fields to unlock dashboard and stats."}
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
