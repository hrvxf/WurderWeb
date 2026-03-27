import type { Metadata } from "next";
import SupportContent from "@/content/legal/support.mdx";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "Support",
  description: "Get support for join links and game codes.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="mt-2 border-t border-white/10 pt-7 sm:pt-8">
        <SupportContent />
      </article>
      <aside className="surface-card p-5 sm:p-6">
        <h2 className="text-2xl font-semibold">Direct contact</h2>
        <p className="mt-2.5 text-soft">Email hello@wurder.app for support, privacy, or legal questions.</p>
        <div className="mt-4">
          <Button href="mailto:hello@wurder.app">Email Support</Button>
        </div>
      </aside>
    </section>
  );
}


