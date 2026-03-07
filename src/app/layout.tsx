import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";
import AnalyticsScripts from "@/components/AnalyticsScripts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wurder.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wurder | Social Assassin Game",
    template: "%s | Wurder",
  },
  description:
    "Fast social assassin gameplay. Join with a game code, validate handoff fast, and open directly in the Wurder app.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Wurder",
    title: "Wurder",
    description: "Join with a game code and move from web to app without friction.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Wurder",
    description: "Social assassin game with fast join handoff.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsScripts />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}


