import type { Metadata } from "next";
import TermsContent from "@/content/legal/terms.mdx";

export const metadata: Metadata = {
  title: "Terms",
  description: "Wurder usage terms and fair-play expectations.",
};

export default function TermsPage() {
  return (
    <article className="mt-2 border-t border-white/10 pt-7 sm:pt-8">
      <TermsContent />
    </article>
  );
}
