import type { ReactNode } from "react";
import { cookies } from "next/headers";

import SiteHeader from "@/components/shell/SiteHeader";
import SiteFooter from "@/components/shell/SiteFooter";
import { AUTH_SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/auth/server-session";
import { readMemberShellIdentity } from "@/lib/auth/member-server-profile";

export default async function AppShell({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
  const session = await verifySessionCookieValue(rawCookie);
  let initialAccount: { displayName: string; wurderId: string | null; avatarUrl: string | null } | null = null;

  if (session?.uid) {
    try {
      initialAccount = await readMemberShellIdentity(session.uid);
    } catch {
      initialAccount = null;
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 top-16 h-56 w-56 rounded-full bg-[#C7355D]/25 blur-3xl" />
        <div className="absolute -right-20 top-8 h-48 w-48 rounded-full bg-[#D96A5A]/20 blur-3xl" />
      </div>
      <SiteHeader initialAccount={initialAccount} />
      <main className="page-wrap w-full flex-1 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
