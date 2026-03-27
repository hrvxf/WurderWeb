import type { Metadata } from "next";
import TermsContent from "@/content/legal/terms.mdx";

export const metadata: Metadata = {
  title: "Terms",
  description: "Wurder usage terms and fair-play expectations.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto mt-2 max-w-4xl border-t border-white/10 pt-7 sm:pt-8">
      <TermsContent />
    </article>
  );
}
