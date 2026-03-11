"use client";

import ProfileForm from "@/components/members/ProfileForm";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isProfileComplete } from "@/lib/auth/profile-bootstrap";

export default function MembersProfilePage() {
  const { profile } = useAuth();
  const complete = isProfileComplete(profile);

  return (
    <div className="space-y-4">
      <div className="glass-surface rounded-3xl p-5">
        <p className="text-sm text-soft">
          {complete
            ? "Your profile is complete. You can still update name and avatar."
            : "Complete required fields to unlock dashboard and stats."}
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
