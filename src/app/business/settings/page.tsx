import type { Metadata } from "next";
import Link from "next/link";

import AuthGate from "@/components/auth/AuthGate";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

export const metadata: Metadata = {
  title: "Business Settings",
  description: "Business organisation settings and controls.",
  alternates: { canonical: "/business/settings" },
};

export default function BusinessSettingsPage() {
  return (
    <AuthGate>
      <section className="mx-auto w-full max-w-[44rem] space-y-4 py-4">
        <div className="surface-card p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/65">Business</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Organisation settings</h1>
          <p className="mt-2 text-sm text-white/75">
            Settings controls are not fully released yet. Core Business workflows are available now.
          </p>

          <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/90">
            Coming soon: organisation defaults, template presets, and permission controls.
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href={BUSINESS_ROUTES.createSession} className="cta-session text-sm">
              Start session
            </Link>
            <Link
              href={BUSINESS_ROUTES.dashboard}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </section>
    </AuthGate>
  );
}
