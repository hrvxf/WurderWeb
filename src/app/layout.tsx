import type { Metadata } from "next";
import { ReactNode } from "react";
import ClientLayoutShell from "./ClientLayoutShell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wurder.co.uk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Wurder",
    template: "%s | Wurder",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <ClientLayoutShell>{children}</ClientLayoutShell>
      </body>
    </html>
  );
}
