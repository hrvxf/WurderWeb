import type { Metadata } from "next";
import TermsContent from "@/content/legal/terms.mdx";

export const metadata: Metadata = {
  title: "Terms",
  description: "Wurder usage terms and fair-play expectations.",
};

export default function TermsPage() {
  return (
    <article className="glass-surface rounded-3xl px-6 py-8 sm:px-10">
      <TermsContent />
    </article>
  );
}
