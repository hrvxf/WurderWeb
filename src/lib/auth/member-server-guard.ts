import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_ROUTES } from "@/lib/auth/route-helpers";
import {
  AUTH_SESSION_COOKIE_NAME,
  isServerProfileComplete,
  verifySessionCookieValue,
} from "@/lib/auth/server-session";

type RequireMemberAccessInput = {
  nextPath: string;
  requireCompleteProfile?: boolean;
};

export async function requireMemberAccess({
  nextPath,
  requireCompleteProfile = false,
}: RequireMemberAccessInput): Promise<{ uid: string }> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
  const session = await verifySessionCookieValue(rawCookie);

  if (!session?.uid) {
    redirect(`${AUTH_ROUTES.login}?next=${encodeURIComponent(nextPath)}`);
  }

  if (requireCompleteProfile) {
    const complete = await isServerProfileComplete(session.uid);
    if (!complete) {
      redirect(AUTH_ROUTES.membersProfile);
    }
  }

  return session;
}
