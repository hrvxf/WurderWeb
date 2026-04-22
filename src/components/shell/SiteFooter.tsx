import Link from "next/link";
import StoreBadges from "@/components/store/StoreBadges";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/20">
      <div className="page-wrap py-8">
        <StoreBadges location="site_footer" className="mb-5" />
        <div className="flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Wurder. Fair play starts with clear rules.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/privacy" className="legal-action-link">Privacy</Link>
          <Link href="/terms" className="legal-action-link">Terms</Link>
          <Link href="/contact" className="legal-action-link">Support</Link>
        </div>
        </div>
      </div>
    </footer>
  );
}
