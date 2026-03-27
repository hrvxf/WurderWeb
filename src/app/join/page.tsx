import type { Metadata } from "next";
import JoinPageClient from "@/app/join/page.client";

export const metadata: Metadata = {
  title: "Join",
  description: "Join with a game code or create a host QR for your session.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return <JoinPageClient />;
}
