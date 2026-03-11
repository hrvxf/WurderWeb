import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/shell/AppShell";
import AnalyticsScripts from "@/components/AnalyticsScripts";
import AppProviders from "@/components/providers/AppProviders";
import { readPublicEnv } from "@/lib/env";
import "./globals.css";

const siteUrl =
  readPublicEnv("NEXT_PUBLIC_APP_URL") ||
  readPublicEnv("NEXT_PUBLIC_SITE_URL") ||
  "https://wurder.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wurder | Social Assassin Game",
    template: "%s | Wurder",
  },
  description:
    "Fast social assassin gameplay. Join with a game code, validate handoff fast, and open directly in the Wurder app.",
  manifest: "/favicons/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicons/icons/16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/icons/32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/icons/master_icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicons/icons/32x32.png" }],
    apple: [{ url: "/favicons/icons/180x180.png", sizes: "180x180", type: "image/png" }],
  },
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
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}


