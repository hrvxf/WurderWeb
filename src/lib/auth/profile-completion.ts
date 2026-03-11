import type { WurderUserProfile } from "@/lib/types/user";

function cleanText(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function isProfileComplete(profile: WurderUserProfile | null): boolean {
  if (!profile) return false;
  const hasWurderId = Boolean(cleanText(profile.wurderId));
  const hasFullName =
    Boolean(cleanText(profile.name)) ||
    (Boolean(cleanText(profile.firstName)) && Boolean(cleanText(profile.lastName)));
  return hasWurderId && hasFullName;
}

