import { buildName, normalizePersonName, normalizeWurderId } from "@/lib/auth/auth-helpers";

function cleanText(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanName(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = normalizePersonName(value);
  return normalized.length > 0 ? normalized : undefined;
}

export type CanonicalAccountProfile = {
  firstName?: string;
  lastName?: string;
  name?: string;
  wurderId?: string;
  wurderIdLower?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
};

export function resolveCanonicalAccountProfile(source: Record<string, unknown>): CanonicalAccountProfile {
  const firstName = cleanName(typeof source.firstName === "string" ? source.firstName : undefined);
  const lastName =
    cleanName(typeof source.lastName === "string" ? source.lastName : undefined) ??
    cleanName(typeof source.secondName === "string" ? source.secondName : undefined);
  const wurderId =
    cleanText(typeof source.wurderId === "string" ? source.wurderId : undefined) ??
    cleanText(typeof source.username === "string" ? source.username : undefined);
  const wurderIdLower =
    cleanText(typeof source.wurderIdLower === "string" ? source.wurderIdLower : undefined) ??
    cleanText(typeof source.usernameLower === "string" ? source.usernameLower : undefined) ??
    (wurderId ? normalizeWurderId(wurderId) : undefined);
  const avatarUrl =
    cleanText(typeof source.avatarUrl === "string" ? source.avatarUrl : undefined) ??
    cleanText(typeof source.photoURL === "string" ? source.photoURL : undefined) ??
    cleanText(typeof source.avatar === "string" ? source.avatar : undefined) ??
    null;

  return {
    firstName,
    lastName,
    name:
      cleanName(typeof source.name === "string" ? source.name : undefined) ??
      cleanName(buildName(firstName, lastName)),
    wurderId,
    wurderIdLower,
    avatarUrl,
    avatar: avatarUrl,
  };
}
