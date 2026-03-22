"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/AuthProvider";
import { AUTH_ROUTES } from "@/lib/auth/route-helpers";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logout();
      router.replace(AUTH_ROUTES.login);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
