import type { Metadata } from "next";
import SupportContent from "@/content/legal/support.mdx";
import Button from "@/components/Button";

export const metadata: Metadata = {
  title: "Support",
  description: "Get support for join links and game codes.",
};

export default function ContactPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <article className="glass-surface rounded-3xl px-6 py-8 sm:px-10">
        <SupportContent />
      </article>
      <aside className="glass-surface rounded-3xl p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Direct contact</h2>
        <p className="mt-3 text-soft">Email hello@wurder.app for support, privacy, or legal questions.</p>
        <div className="mt-6">
          <Button href="mailto:hello@wurder.app">Email Support</Button>
        </div>
      </aside>
    </section>
  );
}


