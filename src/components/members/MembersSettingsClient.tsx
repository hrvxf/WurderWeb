"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth/AuthProvider";

export default function MembersSettingsClient() {
  const { profile, user } = useAuth();

  return (
    <section className="space-y-6">
      <div className="border-t border-white/10 pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Settings</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Account</h2>
        <p className="mt-2 text-sm text-soft">
          Manage account-level actions and profile safety options.
        </p>
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Account details</p>
        <h3 className="mt-2 text-lg font-semibold">Account</h3>
        <dl className="mt-4 divide-y divide-white/10 border-y border-white/10 text-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Email</dt>
            <dd className="font-semibold text-white">{profile?.email ?? user?.email ?? "Not available"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-muted">Wurder ID</dt>
            <dd className="font-semibold text-white">
              {profile?.wurderId ? `@${profile.wurderId}` : "Not set"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-l-2 border-red-300/40 bg-red-950/18 px-4 py-3.5">
          <p className="text-xs uppercase tracking-[0.18em] text-red-100/85">Danger Zone</p>
          <p className="mt-1 text-sm font-semibold text-red-100">Delete account</p>
          <p className="mt-1 text-sm text-red-100/85">
            Permanently delete your account and associated user data using the account deletion process.
          </p>
          <div className="mt-3">
            <Link
              href="/delete-account"
              className="inline-flex min-h-10 items-center rounded-xl border border-red-300/40 bg-red-600/20 px-4 py-2.5 text-sm font-semibold text-red-50 transition hover:bg-red-600/30"
            >
              Delete account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
