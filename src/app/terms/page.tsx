import type { Metadata } from "next";
import TermsContent from "@/content/legal/terms.mdx";

export const metadata: Metadata = {
  title: "Terms",
  description: "Wurder usage terms and fair-play expectations.",
};

export default function TermsPage() {
  return (
    <section className="legal-shell">
      <article className="legal-card mx-auto max-w-4xl">
        <div className="max-w-none">
          <TermsContent />
        </div>
      </article>
    </section>
  );
}
