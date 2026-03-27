import type { Metadata } from "next";
import JoinPageClient from "@/app/join/page.client";

export const metadata: Metadata = {
  title: "Join",
  description: "Join with a game code or start a personal session.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return <JoinPageClient />;
}
