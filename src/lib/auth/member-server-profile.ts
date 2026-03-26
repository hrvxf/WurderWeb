import "server-only";

import { adminDb } from "@/lib/firebase/admin";

type MemberShellIdentity = {
  displayName: string;
  wurderId: string | null;
  avatarUrl: string | null;
};

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDisplayName(
  firstName: string | null,
  lastName: string | null,
  fallbackName: string | null
): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (full) return full;
  if (fallbackName) return fallbackName;
  return "Wurder Member";
}

export async function readMemberShellIdentity(uid: string): Promise<MemberShellIdentity> {
  const [usersSnap, accountsSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("accounts").doc(uid).get(),
  ]);

  const usersData = (usersSnap.data() ?? {}) as Record<string, unknown>;
  const accountsData = (accountsSnap.data() ?? {}) as Record<string, unknown>;

  const firstName =
    cleanText(usersData.firstName) ??
    cleanText(accountsData.firstName);
  const lastName =
    cleanText(usersData.lastName) ??
    cleanText(accountsData.secondName);
  const name =
    cleanText(usersData.name) ??
    cleanText(accountsData.name);
  const wurderId =
    cleanText(usersData.wurderId) ??
    cleanText(accountsData.username);
  const avatarUrl =
    cleanText(usersData.avatarUrl) ??
    cleanText(usersData.avatar) ??
    cleanText(accountsData.avatarUrl) ??
    cleanText(accountsData.photoURL) ??
    cleanText(accountsData.avatar);

  return {
    displayName: buildDisplayName(firstName, lastName, name),
    wurderId,
    avatarUrl: avatarUrl ?? null,
  };
}
