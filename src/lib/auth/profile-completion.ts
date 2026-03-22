import type { WurderUserProfile } from "@/lib/types/user";

function cleanText(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function isProfileComplete(profile: WurderUserProfile | null): boolean {
  return getProfileCompletionStatus(profile).complete;
}

export type ProfileCompletionStatus = {
  complete: boolean;
  missingFields: Array<"wurderId" | "firstName" | "lastName">;
};

export function getProfileCompletionStatus(profile: WurderUserProfile | null): ProfileCompletionStatus {
  if (!profile) return { complete: false, missingFields: ["wurderId", "firstName", "lastName"] };
  const hasWurderId = Boolean(cleanText(profile.wurderId));
  const hasFirstName = Boolean(cleanText(profile.firstName));
  const hasLastName = Boolean(cleanText(profile.lastName));
  const hasDisplayName = Boolean(cleanText(profile.name));

  const missingFields: Array<"wurderId" | "firstName" | "lastName"> = [];
  if (!hasWurderId) {
    missingFields.push("wurderId");
  }

  if (!hasDisplayName) {
    if (!hasFirstName) {
      missingFields.push("firstName");
    }
    if (!hasLastName) {
      missingFields.push("lastName");
    }
  }

  return {
    complete: missingFields.length === 0,
    missingFields,
  };
}
