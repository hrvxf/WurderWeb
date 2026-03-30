export type BusinessSessionGroupType = "real" | "virtual";
export type SessionIdentitySource =
  | "org_session_doc"
  | "org_game_link_session_ref"
  | "org_game_link_game_code"
  | "games_org_fallback";
export type SessionIdentityConfidence = "high" | "medium" | "low";

const GROUP_ID_PREFIX = "sg_";

function encodeBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }
  const utf8Bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of utf8Bytes) binary += String.fromCharCode(byte);
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

function normalizeIdentity(input: {
  orgId: string;
  sessionKey: string;
  type: BusinessSessionGroupType;
}): string {
  return `${input.type}:${input.orgId}:${input.sessionKey}`;
}

export function makeBusinessSessionGroupId(input: {
  orgId: string;
  sessionKey: string;
  type: BusinessSessionGroupType;
}): string {
  return `${GROUP_ID_PREFIX}${encodeBase64Url(normalizeIdentity(input))}`;
}

export function parseBusinessSessionGroupId(
  value: string
): { type: BusinessSessionGroupType; orgId: string; sessionKey: string } | null {
  if (!value.startsWith(GROUP_ID_PREFIX)) return null;
  const encoded = value.slice(GROUP_ID_PREFIX.length);
  if (!encoded) return null;

  try {
    const decoded = decodeBase64Url(encoded);
    const [typeRaw, orgId, ...rest] = decoded.split(":");
    const sessionKey = rest.join(":");
    if (!orgId || !sessionKey) return null;
    if (typeRaw !== "real" && typeRaw !== "virtual") return null;
    return {
      type: typeRaw,
      orgId,
      sessionKey,
    };
  } catch {
    return null;
  }
}

export function isBusinessSessionGroupId(value: string): boolean {
  return parseBusinessSessionGroupId(value) != null;
}

export function makeSessionIdentityMetadata(input: {
  orgId: string;
  identitySource: SessionIdentitySource;
  sourceSessionId: string | null;
  gameCodes: string[];
}): {
  identityKey: string;
  identitySource: SessionIdentitySource;
  identityConfidence: SessionIdentityConfidence;
  identityNeedsReview: boolean;
} {
  const normalizedGameCodes = [...input.gameCodes].sort();
  const primaryGameCode = normalizedGameCodes[0] ?? "unknown";

  if (input.identitySource === "org_session_doc") {
    return {
      identityKey: `org:${input.orgId}:session:${input.sourceSessionId ?? primaryGameCode}`,
      identitySource: input.identitySource,
      identityConfidence: "high",
      identityNeedsReview: false,
    };
  }

  if (input.identitySource === "org_game_link_session_ref") {
    return {
      identityKey: `org:${input.orgId}:session_ref:${input.sourceSessionId ?? primaryGameCode}`,
      identitySource: input.identitySource,
      identityConfidence: "medium",
      identityNeedsReview: false,
    };
  }

  if (input.identitySource === "org_game_link_game_code") {
    return {
      identityKey: `org:${input.orgId}:game_link:${primaryGameCode}`,
      identitySource: input.identitySource,
      identityConfidence: "medium",
      identityNeedsReview: false,
    };
  }

  return {
    identityKey: `org:${input.orgId}:game_fallback:${primaryGameCode}`,
    identitySource: input.identitySource,
    identityConfidence: "low",
    identityNeedsReview: true,
  };
}
