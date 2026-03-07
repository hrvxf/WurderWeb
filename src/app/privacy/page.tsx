import type { Metadata } from "next";
import PrivacyContent from "@/content/legal/privacy.mdx";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Wurder handles account, gameplay, and support data.",
};

export default function PrivacyPage() {
  return (
    <article className="glass-surface rounded-3xl px-6 py-8 sm:px-10">
      <PrivacyContent />
    </article>
  );
}


