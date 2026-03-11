import type { Metadata } from "next";
import JoinPageClient from "@/app/join/page.client";

export const metadata: Metadata = {
  title: "Join",
  description: "Create a Wurder game QR to share with players.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return <JoinPageClient />;
}
