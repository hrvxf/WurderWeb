import type { Metadata } from "next";
import PrivacyContent from "@/content/legal/privacy.mdx";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Wurder handles account, gameplay, and support data.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto mt-2 max-w-4xl border-t border-white/10 pt-7 sm:pt-8">
      <PrivacyContent />
    </article>
  );
}


