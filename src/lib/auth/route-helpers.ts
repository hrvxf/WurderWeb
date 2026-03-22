import type { WurderUserProfile } from "@/lib/types/user";

import { isProfileComplete } from "@/lib/auth/profile-completion";

export const AUTH_ROUTES = {
  login: "/login",
  signup: "/signup",
  members: "/members",
  membersProfile: "/members/profile",
  membersStats: "/members/stats",
  membersHost: "/members/host",
  membersSettings: "/members/settings",
} as const;

export function getPostAuthRoute(profile: WurderUserProfile | null): string {
  if (!isProfileComplete(profile)) return AUTH_ROUTES.membersProfile;
  return AUTH_ROUTES.members;
}

export function requiresCompletedProfile(pathname: string): boolean {
  if (!pathname.startsWith("/members")) return false;
  return pathname !== AUTH_ROUTES.membersProfile;
}

export function toNextPath(pathname: string): string {
  if (!pathname.startsWith("/")) return AUTH_ROUTES.members;
  return pathname;
}
