import type { ReactNode } from "react";
import SiteHeader from "@/components/shell/SiteHeader";
import SiteFooter from "@/components/shell/SiteFooter";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-[#C7355D]/25 blur-3xl" />
        <div className="absolute -right-20 top-8 h-48 w-48 rounded-full bg-[#D96A5A]/20 blur-3xl" />
      </div>
      <SiteHeader />
      <main className="page-wrap w-full flex-1 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
