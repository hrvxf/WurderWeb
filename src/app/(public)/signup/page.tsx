"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import SignupForm from "@/components/auth/SignupForm";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getPostAuthRoute } from "@/lib/auth/route-helpers";

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, loading, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      router.replace(getPostAuthRoute(profile));
    }
  }, [isAuthenticated, loading, profile, router]);

  if (loading) {
    return (
      <section className="py-2">
        <div className="glass-surface rounded-3xl p-8 text-center text-soft">Loading sign-up...</div>
      </section>
    );
  }

  if (isAuthenticated) return null;

  return (
    <section className="py-2">
      <SignupForm />
    </section>
  );
}
