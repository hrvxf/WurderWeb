import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import StartSessionPageClient from "@/app/start-session/page.client";
import { AUTH_SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "Start Session",
  description: "Choose setup options and generate a QR handoff for app continuation.",
  alternates: { canonical: "/start-session" },
};

export default async function StartSessionPage() {
  const cookieStore = await cookies();
  const rawSessionCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
  const session = await verifySessionCookieValue(rawSessionCookie);

  if (!session?.uid) {
    redirect("/login?next=%2Fstart-session");
  }

  return <StartSessionPageClient />;
}
