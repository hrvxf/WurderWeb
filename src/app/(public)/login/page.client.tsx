"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getPostAuthRoute, toNextPath } from "@/lib/auth/route-helpers";

type LoginPageClientProps = {
  nextParam?: string;
};

export default function LoginPageClient({ nextParam }: LoginPageClientProps) {
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
        <div className="glass-surface rounded-3xl p-8 text-center text-soft">Loading sign-in...</div>
      </section>
    );
  }

  if (isAuthenticated) return null;

  return (
    <section className="py-2">
      <LoginForm nextPath={nextParam ? toNextPath(nextParam) : undefined} />
    </section>
  );
}
