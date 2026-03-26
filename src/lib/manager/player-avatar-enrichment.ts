import { adminDb } from "@/lib/firebase/admin";

type PlayerAnalyticsDoc = {
  id: string;
  data: Record<string, unknown>;
};

type ProfileCollection = "users" | "accounts" | "profiles";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractAvatarUrl(value: Record<string, unknown>): string | null {
  return (
    asNonEmptyString(value.avatarUrl) ??
    asNonEmptyString(value.avatarURL) ??
    asNonEmptyString(value.photoURL) ??
    asNonEmptyString(value.photoUrl) ??
    asNonEmptyString(value.profilePhotoUrl) ??
    asNonEmptyString(value.imageUrl) ??
    asNonEmptyString(value.imageURL) ??
    asNonEmptyString(value.avatar)
  );
}

function extractDisplayName(value: Record<string, unknown>): string | null {
  const firstName = asNonEmptyString(value.firstName);
  const lastName = asNonEmptyString(value.lastName) ?? asNonEmptyString(value.secondName);
  if (firstName || lastName) {
    const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    if (fullName.length > 0) return fullName;
  }

  return (
    asNonEmptyString(value.name) ??
    asNonEmptyString(value.displayName) ??
    asNonEmptyString(value.playerName) ??
    asNonEmptyString(value.wurderId) ??
    asNonEmptyString(value.username) ??
    asNonEmptyString(value.handle)
  );
}

function currentDisplayName(doc: PlayerAnalyticsDoc): string | null {
  const data = doc.data;
  return (
    asNonEmptyString(data.displayName) ??
    asNonEmptyString(data.playerName) ??
    asNonEmptyString(data.name) ??
    asNonEmptyString(data.wurderId) ??
    asNonEmptyString(data.username) ??
    asNonEmptyString(data.handle)
  );
}

function collectCandidateIds(doc: PlayerAnalyticsDoc): string[] {
  const ids = [
    asNonEmptyString(doc.data.userId),
    asNonEmptyString(doc.data.playerId),
    asNonEmptyString(doc.data.uid),
    asNonEmptyString(doc.id),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(ids)];
}

async function loadAvatarMap(collection: ProfileCollection, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const refs = ids.map((id) => adminDb.collection(collection).doc(id));
  const snapshots = await adminDb.getAll(...refs);
  const avatarById = new Map<string, string>();
  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue;
    const data = (snapshot.data() ?? {}) as Record<string, unknown>;
    const avatar = extractAvatarUrl(data);
    if (!avatar) continue;
    avatarById.set(snapshot.id, avatar);
  }
  return avatarById;
}

async function loadDisplayNameMap(collection: ProfileCollection, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const refs = ids.map((id) => adminDb.collection(collection).doc(id));
  const snapshots = await adminDb.getAll(...refs);
  const byId = new Map<string, string>();
  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue;
    const data = (snapshot.data() ?? {}) as Record<string, unknown>;
    const displayName = extractDisplayName(data);
    if (!displayName) continue;
    byId.set(snapshot.id, displayName);
  }
  return byId;
}

export async function enrichPlayerAnalyticsWithAvatars(playerAnalyticsDocs: PlayerAnalyticsDoc[]): Promise<PlayerAnalyticsDoc[]> {
  if (playerAnalyticsDocs.length === 0) return playerAnalyticsDocs;

  const needsEnrichmentDocs = playerAnalyticsDocs.filter((doc) => {
    const hasAvatar = Boolean(extractAvatarUrl(doc.data));
    const displayName = currentDisplayName(doc);
    const ids = collectCandidateIds(doc);
    const looksLikeUid = displayName != null && ids.includes(displayName);
    return !hasAvatar || !displayName || looksLikeUid;
  });
  if (needsEnrichmentDocs.length === 0) return playerAnalyticsDocs;

  const allCandidateIds = [...new Set(needsEnrichmentDocs.flatMap((doc) => collectCandidateIds(doc)))];
  if (allCandidateIds.length === 0) return playerAnalyticsDocs;

  const [usersAvatarMap, accountsAvatarMap, profilesAvatarMap, usersNameMap, accountsNameMap, profilesNameMap] = await Promise.all([
    loadAvatarMap("users", allCandidateIds),
    loadAvatarMap("accounts", allCandidateIds),
    loadAvatarMap("profiles", allCandidateIds),
    loadDisplayNameMap("users", allCandidateIds),
    loadDisplayNameMap("accounts", allCandidateIds),
    loadDisplayNameMap("profiles", allCandidateIds),
  ]);

  return playerAnalyticsDocs.map((doc) => {
    const existingAvatar = extractAvatarUrl(doc.data);
    const candidateIds = collectCandidateIds(doc);
    const resolvedAvatar = existingAvatar
      ? existingAvatar
      : candidateIds
          .map((id) => usersAvatarMap.get(id) ?? accountsAvatarMap.get(id) ?? profilesAvatarMap.get(id) ?? null)
          .find((value): value is string => Boolean(value));
    const existingDisplay = currentDisplayName(doc);
    const resolvedDisplayName = candidateIds
      .map((id) => usersNameMap.get(id) ?? accountsNameMap.get(id) ?? profilesNameMap.get(id) ?? null)
      .find((value): value is string => Boolean(value));
    const useResolvedDisplayName =
      Boolean(resolvedDisplayName) &&
      (!existingDisplay || candidateIds.includes(existingDisplay));

    if (!resolvedAvatar && !useResolvedDisplayName) return doc;

    return {
      ...doc,
      data: {
        ...doc.data,
        ...(resolvedAvatar ? { avatarUrl: resolvedAvatar } : {}),
        ...(useResolvedDisplayName && resolvedDisplayName ? { displayName: resolvedDisplayName } : {}),
      },
    };
  });
}
