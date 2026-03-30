import { adminDb } from "@/lib/firebase/admin";
import { makeStaffKey } from "@/lib/business/staff-identity";
import { buildBusinessSessionsIndexReadModel } from "@/lib/business/sessions-read-model";

export type StaffObservation = {
  gameCode: string;
  orgId: string;
  orgName: string | null;
  sessionName: string;
  sessionStatus: "not_started" | "in_progress" | "ended";
  observedAt: string | null;
  playerId: string;
  displayName: string;
  avatarUrl: string | null;
  claimsSubmitted: number;
  claimsConfirmed: number;
  claimsDenied: number;
  accuracyRatio: number | null;
  disputeRateRatio: number | null;
  deaths: number;
  identityConfidence: "high" | "medium" | "low";
  identityNeedsReview: boolean;
  identitySource: string;
};

export type StaffDirectoryRow = {
  staffKey: string;
  identityKey: string;
  displayName: string;
  avatarUrl: string | null;
  orgId: string;
  orgName: string | null;
  sessionsPlayed: number;
  latestAccuracyRatio: number | null;
  trendIndicator: "up" | "down" | "flat" | "unknown";
  identityConfidence: "high" | "medium" | "low";
  identityNeedsReview: boolean;
  identitySource: string;
};

export type StaffDetailReadModel = {
  directory: StaffDirectoryRow[];
  observationsByKey: Map<string, StaffObservation[]>;
};

const STAFF_CACHE_TTL_MS = 20_000;
const staffCache = new Map<string, { expiresAt: number; data: StaffDetailReadModel }>();

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const ts = value as { toDate?: unknown };
    if (typeof ts.toDate !== "function") return null;
    const date = ts.toDate();
    return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  return null;
}

function trendFromSeries(series: Array<number | null>): "up" | "down" | "flat" | "unknown" {
  const valid = series.filter((entry): entry is number => entry != null && Number.isFinite(entry));
  if (valid.length < 2) return "unknown";
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (last - first > 0.03) return "up";
  if (first - last > 0.03) return "down";
  return "flat";
}

type PlayerIdentitySource = "player_user_id" | "player_uid" | "account_mapping" | "org_player_fallback";

type PlayerIdentityResolution = {
  identityKey: string;
  source: PlayerIdentitySource;
};

type TeamMemberOverrideDoc = {
  deletedAt?: unknown;
};

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

async function resolveUidViaDeterministicMapping(candidateRaw: string): Promise<string | null> {
  const candidate = candidateRaw.trim();
  if (!candidate) return null;

  const [userDoc, accountDoc] = await Promise.all([
    adminDb.collection("users").doc(candidate).get(),
    adminDb.collection("accounts").doc(candidate).get(),
  ]);

  if (userDoc.exists) {
    const data = (userDoc.data() ?? {}) as Record<string, unknown>;
    return asNonEmptyString(data.uid) ?? candidate;
  }

  if (accountDoc.exists) {
    const data = (accountDoc.data() ?? {}) as Record<string, unknown>;
    return asNonEmptyString(data.uid) ?? candidate;
  }

  const usernameDoc = await adminDb.collection("usernames").doc(normalizeLookupKey(candidate)).get();
  if (usernameDoc.exists) {
    const data = (usernameDoc.data() ?? {}) as Record<string, unknown>;
    return asNonEmptyString(data.uid);
  }

  return null;
}

async function resolvePlayerIdentity(input: {
  orgId: string;
  gameCode: string;
  player: Record<string, unknown>;
  playerId: string;
  lowConfidence: boolean;
  uidMapCache: Map<string, Promise<string | null>>;
}): Promise<PlayerIdentityResolution> {
  const explicitUserId = asNonEmptyString(input.player.userId);
  if (explicitUserId) {
    return { identityKey: `canonical_uid:${explicitUserId}`, source: "player_user_id" };
  }

  const explicitUid = asNonEmptyString(input.player.uid);
  if (explicitUid) {
    return { identityKey: `canonical_uid:${explicitUid}`, source: "player_uid" };
  }

  const mappingCandidates = [
    input.playerId,
    asNonEmptyString(input.player.accountId),
    asNonEmptyString(input.player.resolvedUid),
    asNonEmptyString(input.player.canonicalUid),
    asNonEmptyString(input.player.accountUid),
  ].filter((value): value is string => value != null && value.length > 0);

  for (const candidate of mappingCandidates) {
    const cacheKey = normalizeLookupKey(candidate);
    const pending =
      input.uidMapCache.get(cacheKey) ??
      resolveUidViaDeterministicMapping(candidate).catch(() => null);
    input.uidMapCache.set(cacheKey, pending);
    const resolvedUid = await pending;
    if (resolvedUid) {
      return { identityKey: `canonical_uid:${resolvedUid}`, source: "account_mapping" };
    }
  }

  if (input.lowConfidence) {
    return {
      identityKey: `uncertain:${input.orgId}:${input.gameCode}:${input.playerId}`,
      source: "org_player_fallback",
    };
  }

  return {
    identityKey: `canonical_org_player:${input.orgId}:${input.playerId}`,
    source: "org_player_fallback",
  };
}

export async function buildStaffReadModel(uid: string): Promise<StaffDetailReadModel> {
  const now = Date.now();
  const cached = staffCache.get(uid);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const orgRows = await buildBusinessSessionsIndexReadModel(uid);
  const gameToSession = new Map<
    string,
    {
      orgId: string;
      orgName: string | null;
      sessionName: string;
      sessionStatus: "not_started" | "in_progress" | "ended";
      identityConfidence: "high" | "medium" | "low";
      identityNeedsReview: boolean;
      identitySource: string;
    }
  >();

  for (const orgRow of orgRows) {
    for (const session of orgRow.sessions) {
      for (const gameCode of session.gameCodes) {
        gameToSession.set(gameCode.trim().toUpperCase(), {
          orgId: orgRow.org.orgId,
          orgName: orgRow.org.name,
          sessionName: session.derivedName,
          sessionStatus: session.status,
          identityConfidence: session.identityConfidence,
          identityNeedsReview: session.identityNeedsReview,
          identitySource: session.identitySource,
        });
      }
    }
  }

  const gameCodes = [...gameToSession.keys()];
  const dashboardRefs = gameCodes.map((gameCode) => adminDb.collection("managerDashboard").doc(gameCode));
  const dashboardDocs = dashboardRefs.length > 0 ? await adminDb.getAll(...dashboardRefs) : [];
  const uidMapCache = new Map<string, Promise<string | null>>();
  const deletedStaffByOrg = new Map<string, Set<string>>();
  const deletedStaffGlobal = new Set<string>();

  const deletedGlobalSnap = await adminDb.collection("businessUsers").doc(uid).collection("deletedTeamMembers").get();
  for (const doc of deletedGlobalSnap.docs) {
    const data = (doc.data() ?? {}) as TeamMemberOverrideDoc;
    if (timestampToIso(data.deletedAt) != null) deletedStaffGlobal.add(doc.id);
  }

  await Promise.all(
    orgRows.map(async (orgRow) => {
      const orgId = orgRow.org.orgId;
      const [canonicalTeamMembersSnap, legacyTeamMembersSnap] = await Promise.all([
        adminDb.collection("orgs").doc(orgId).collection("teamMembers").get(),
        adminDb.collection("organizations").doc(orgId).collection("teamMembers").get(),
      ]);
      const deletedStaff = new Set<string>();
      for (const doc of canonicalTeamMembersSnap.docs) {
        const data = (doc.data() ?? {}) as TeamMemberOverrideDoc;
        if (timestampToIso(data.deletedAt) != null) deletedStaff.add(doc.id);
      }
      for (const doc of legacyTeamMembersSnap.docs) {
        const data = (doc.data() ?? {}) as TeamMemberOverrideDoc;
        if (timestampToIso(data.deletedAt) != null) deletedStaff.add(doc.id);
      }
      deletedStaffByOrg.set(orgId, deletedStaff);
    })
  );

  const grouped = new Map<string, StaffObservation[]>();
  for (let i = 0; i < dashboardDocs.length; i += 1) {
    const doc = dashboardDocs[i];
    if (!doc.exists) continue;
    const gameCode = gameCodes[i] ?? "";
    const sessionMeta = gameToSession.get(gameCode);
    if (!sessionMeta) continue;

    const dashboard = (doc.data() ?? {}) as { analytics?: unknown; generatedAt?: unknown };
    const analytics = dashboard.analytics && typeof dashboard.analytics === "object" ? (dashboard.analytics as Record<string, unknown>) : {};
    const playerRows = Array.isArray(analytics.playerPerformance) ? analytics.playerPerformance : [];
    const observedAt = asNonEmptyString(analytics.updatedAt) ?? asNonEmptyString(dashboard.generatedAt);

    const observationPromises = playerRows.map(async (row) => {
      const player = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      const playerId = asNonEmptyString(player.playerId) ?? asNonEmptyString(player.displayName);
      if (!playerId) return null;

      const displayName = asNonEmptyString(player.displayName) ?? playerId;
      const avatarUrl = asNonEmptyString(player.avatarUrl);
      const claimsSubmitted = Math.max(0, asNumber(player.claimsSubmitted) ?? 0);
      const claimsConfirmed = Math.max(0, asNumber(player.claimsConfirmed) ?? 0);
      const claimsDenied = Math.max(0, asNumber(player.claimsDenied) ?? 0);
      const accuracyRatio = asNumber(player.accuracyRatio);
      const disputeRateRatio = asNumber(player.disputeRateRatio);
      const deaths = Math.max(0, asNumber(player.deaths) ?? 0);

      const lowConfidence = sessionMeta.identityNeedsReview || sessionMeta.identityConfidence === "low";
      const identity = await resolvePlayerIdentity({
        orgId: sessionMeta.orgId,
        gameCode,
        player,
        playerId,
        lowConfidence,
        uidMapCache,
      });
      const staffKey = makeStaffKey(identity.identityKey);
      if (deletedStaffGlobal.has(staffKey)) {
        return null;
      }
      if (deletedStaffByOrg.get(sessionMeta.orgId)?.has(staffKey)) {
        return null;
      }

      const observation: StaffObservation = {
        gameCode,
        orgId: sessionMeta.orgId,
        orgName: sessionMeta.orgName,
        sessionName: sessionMeta.sessionName,
        sessionStatus: sessionMeta.sessionStatus,
        observedAt,
        playerId,
        displayName,
        avatarUrl,
        claimsSubmitted,
        claimsConfirmed,
        claimsDenied,
        accuracyRatio,
        disputeRateRatio,
        deaths,
        identityConfidence: identity.source === "org_player_fallback" ? sessionMeta.identityConfidence : "high",
        identityNeedsReview: identity.source === "org_player_fallback" ? sessionMeta.identityNeedsReview : false,
        identitySource: identity.source,
      };
      return { observation, identityKey: identity.identityKey };
    });

    const resolvedObservations = await Promise.all(observationPromises);
    for (const resolved of resolvedObservations) {
      if (!resolved) continue;
      const existing = grouped.get(resolved.identityKey) ?? [];
      existing.push(resolved.observation);
      grouped.set(resolved.identityKey, existing);
    }
  }

  const directory: StaffDirectoryRow[] = [...grouped.entries()]
    .map(([identityKey, observations]) => {
      const sorted = [...observations].sort((left, right) => {
        const leftMs = left.observedAt ? new Date(left.observedAt).getTime() : 0;
        const rightMs = right.observedAt ? new Date(right.observedAt).getTime() : 0;
        return rightMs - leftMs;
      });
      const latest = sorted[0];
      const trend = trendFromSeries([...sorted].reverse().map((entry) => entry.accuracyRatio));
      return {
        staffKey: makeStaffKey(identityKey),
        identityKey,
        displayName: latest?.displayName ?? "Unknown",
        avatarUrl: latest?.avatarUrl ?? null,
        orgId: latest?.orgId ?? "",
        orgName: latest?.orgName ?? null,
        sessionsPlayed: observations.length,
        latestAccuracyRatio: latest?.accuracyRatio ?? null,
        trendIndicator: trend,
        identityConfidence: latest?.identityConfidence ?? "low",
        identityNeedsReview: latest?.identityNeedsReview ?? true,
        identitySource: latest?.identitySource ?? "unknown",
      };
    })
    .sort((left, right) => {
      if (right.sessionsPlayed !== left.sessionsPlayed) return right.sessionsPlayed - left.sessionsPlayed;
      return left.displayName.localeCompare(right.displayName);
    });

  const result = {
    directory,
    observationsByKey: grouped,
  };
  staffCache.set(uid, { expiresAt: now + STAFF_CACHE_TTL_MS, data: result });
  return result;
}

export function clearStaffReadModelCacheForUser(uid?: string): void {
  if (uid) {
    staffCache.delete(uid);
    return;
  }
  staffCache.clear();
}
