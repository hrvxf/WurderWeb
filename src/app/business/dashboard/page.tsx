import type { Metadata } from "next";
import Link from "next/link";

import AuthGate from "@/components/auth/AuthGate";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

export const metadata: Metadata = {
  title: "Business Dashboard",
  description: "Business dashboard surface for Wurder sessions and reporting.",
  alternates: { canonical: "/business/dashboard" },
};

export default function BusinessDashboardPage() {
  return (
    <AuthGate>
      <section className="mx-auto w-full max-w-[54rem] space-y-5 py-4">
        <div className="surface-card p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/65">Business</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Business dashboard</h1>
          <p className="mt-2 text-sm text-white/75">
            Start sessions, access organisation views, and continue active coaching workflows.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href={BUSINESS_ROUTES.createSession} className="cta-session text-sm">
              Start session
            </Link>
            <Link
              href={BUSINESS_ROUTES.home}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Open Business overview
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="surface-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-white/65">Reporting</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Session analytics</h2>
            <p className="mt-2 text-sm text-white/75">
              Open a session to review compare views, player details, and export outputs.
            </p>
          </article>
          <article className="surface-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-white/65">Organisation</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Workspace controls</h2>
            <p className="mt-2 text-sm text-white/75">
              Organisation settings are being expanded. Use session tools as the primary workflow meanwhile.
            </p>
          </article>
        </div>
      </section>
    </AuthGate>
  );
}
