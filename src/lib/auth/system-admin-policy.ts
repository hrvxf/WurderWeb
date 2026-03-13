import type { DecodedIdToken } from "firebase-admin/auth";

const SYSTEM_ADMIN_EMAIL_BRIDGE = "hello@wurder.co.uk";

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function parseSystemAdminUidAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();

  const uids = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return new Set(uids);
}

export function isSystemAdmin(
  token: Pick<DecodedIdToken, "uid" | "email" | "email_verified">,
  uidAllowlistRaw: string | undefined
): boolean {
  const uidAllowlist = parseSystemAdminUidAllowlist(uidAllowlistRaw);
  if (uidAllowlist.has(token.uid)) {
    return true;
  }

  const email = normalizeIdentity(token.email);
  return Boolean(token.email_verified) && email === SYSTEM_ADMIN_EMAIL_BRIDGE;
}
