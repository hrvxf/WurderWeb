import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AuthGate from "@/components/auth/AuthGate";
import { BUSINESS_ROUTES, businessSessionRoute } from "@/lib/business/routes";

export const metadata: Metadata = {
  title: "Business Dashboard",
  description: "Business dashboard surface for Wurder sessions and reporting.",
  alternates: { canonical: "/business/dashboard" },
};

type BusinessDashboardPageProps = {
  searchParams?: Promise<{
    gameCode?: string;
  }>;
};

export default async function BusinessDashboardPage({ searchParams }: BusinessDashboardPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const quickOpenCode = params?.gameCode?.trim() ?? "";
  if (quickOpenCode) {
    redirect(businessSessionRoute(quickOpenCode));
  }

  return (
    <AuthGate>
      <section className="mx-auto w-full max-w-[54rem] space-y-5 py-4">
        <div className="surface-panel p-5 sm:p-6">
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
              className="control-secondary"
            >
              Open Business overview
            </Link>
          </div>
        </div>

        <div className="surface-panel p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/65">Quick Open</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Open an existing session dashboard</h2>
          <p className="mt-2 text-sm text-white/75">Enter a session code to jump straight into that dashboard.</p>
          <form action={BUSINESS_ROUTES.dashboard} method="get" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              aria-label="Session code"
              className="input-dark sm:max-w-xs"
              maxLength={24}
              minLength={3}
              name="gameCode"
              pattern="[A-Za-z0-9-]+"
              placeholder="e.g. ABC123"
              required
              type="text"
            />
            <button className="cta-session text-sm sm:min-w-36" type="submit">
              Open dashboard
            </button>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="surface-panel p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-white/65">Reporting</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Session analytics</h2>
            <p className="mt-2 text-sm text-white/75">
              Open a session to review compare views, player details, and export outputs.
            </p>
          </article>
          <article className="surface-panel p-5">
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
