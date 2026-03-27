import type { Metadata } from "next";
import PrivacyContent from "@/content/legal/privacy.mdx";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Wurder handles account, gameplay, and support data.",
};

export default function PrivacyPage() {
  return (
    <section className="legal-shell">
      <article className="legal-card mx-auto max-w-4xl">
        <div className="max-w-none">
          <PrivacyContent />
        </div>
      </article>
    </section>
  );
}


