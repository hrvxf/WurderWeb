import Link from "next/link";
import AuthGate from "@/components/auth/AuthGate";
import { BUSINESS_ROUTES } from "@/lib/business/routes";

type BusinessSurfacePlaceholderProps = {
  title: string;
  description: string;
};

export default function BusinessSurfacePlaceholder({
  title,
  description,
}: BusinessSurfacePlaceholderProps) {
  return (
    <AuthGate>
      <section className="mx-auto w-full max-w-[44rem] space-y-4 py-4">
        <div className="surface-card p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/65">Business Surface</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-white/75">{description}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href={BUSINESS_ROUTES.createSession}
              className="cta-session text-sm"
            >
              Start session
            </Link>
            <Link
              href={BUSINESS_ROUTES.home}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Back to Business
            </Link>
          </div>
        </div>
      </section>
    </AuthGate>
  );
}
