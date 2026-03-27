import type { Metadata } from "next";
import Link from "next/link";
import SupportContent from "@/content/legal/support.mdx";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "Support",
  description: "Get support for join links and game codes.",
};

export default function ContactPage() {
  return (
    <section className="legal-shell grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="legal-card">
        <div className="max-w-none">
          <SupportContent />
        </div>
      </article>
      <aside className="legal-card">
        <h2 className="text-2xl font-semibold">Direct contact</h2>
        <p className="mt-2.5 text-soft">Email hello@wurder.app for support, privacy, or legal questions.</p>
        <div className="mt-4">
          <Button href="mailto:hello@wurder.app">Email Support</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/privacy" className="legal-action-link">Privacy</Link>
          <Link href="/terms" className="legal-action-link">Terms</Link>
          <Link href="/delete-account" className="legal-action-link">Delete account</Link>
        </div>
      </aside>
    </section>
  );
}


