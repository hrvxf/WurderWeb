const STAFF_KEY_PREFIX = "stf_";

function encodeBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }
  const utf8 = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of utf8) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function makeStaffKey(identityKey: string): string {
  return `${STAFF_KEY_PREFIX}${encodeBase64Url(identityKey)}`;
}

export function parseStaffKey(staffKey: string): string | null {
  if (!staffKey.startsWith(STAFF_KEY_PREFIX)) return null;
  const encoded = staffKey.slice(STAFF_KEY_PREFIX.length);
  if (!encoded) return null;
  try {
    return decodeBase64Url(encoded);
  } catch {
    return null;
  }
}
