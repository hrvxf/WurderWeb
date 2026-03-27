import type { Metadata } from "next";
import JoinPageClient from "@/app/join/page.client";

export const metadata: Metadata = {
  title: "Join",
  description: "Enter a game code and continue in app, or start a personal session.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return <JoinPageClient />;
}
