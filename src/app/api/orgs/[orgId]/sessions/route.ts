import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { deriveLifecycleStatus, type AnalyticsAccess } from "@/lib/analytics/manager-dashboard";
import { makeBusinessSessionGroupId, makeSessionIdentityMetadata, type SessionIdentitySource } from "@/lib/business/session-groups";
import { entitlementsForTier, hasFeature } from "@/lib/product/entitlements";
import {
  assertOrgAccess,
  OrgAccessInfrastructureError,
  OrgForbiddenError,
  OrgNotFoundError,
  OrgUnauthenticatedError,
} from "@/lib/org/access";

export const runtime = "nodejs";

type OrgGameLinkDoc = {
  gameCode?: unknown;
  createdAt?: unknown;
  sessionId?: unknown;
  archivedAt?: unknown;
  deletedAt?: unknown;
  hiddenFromOrgDashboard?: unknown;
};

type OrgDoc = {
  name?: unknown;
  branding?: unknown;
};

type OrgBranding = {
  companyName?: unknown;
  companyLogoUrl?: unknown;
  brandAccentColor?: unknown;
  brandThemeLabel?: unknown;
};

type GameDoc = {
  started?: unknown;
  ended?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  createdAt?: unknown;
  archivedAt?: unknown;
  deletedAt?: unknown;
  hiddenFromOrgDashboard?: unknown;
};

type AnalyticsOverview = {
  status?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  totalPlayers?: unknown;
  successRate?: unknown;
  disputeRate?: unknown;
  averageResolutionTimeMs?: unknown;
};

type ManagerDashboardPlayerRow = {
  claimsSubmitted?: unknown;
  claimsConfirmed?: unknown;
  claimsDenied?: unknown;
  disputeRateRatio?: unknown;
  accuracyRatio?: unknown;
};

type ManagerDashboardAnalytics = {
  overview?: unknown;
  playerPerformance?: unknown;
  averageResolutionTimeMs?: unknown;
};

type ManagerDashboardDoc = {
  analytics?: unknown;
};

type SessionAggregate = {
  sessionId: string;
  sessionType: "real" | "virtual";
  sourceSessionId: string | null;
  identityKey: string;
  identitySource: SessionIdentitySource;
  identityConfidence: "high" | "medium" | "low";
  identityNeedsReview: boolean;
  gameCode: string;
  gameCodes: string[];
  status: string;
  createdAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  playerCount: number;
  claims: number | null;
  disputes: number | null;
  successRate: number | null;
  disputeRate: number | null;
  avgResolutionTimeMs: number | null;
  analyticsAccess: AnalyticsAccess;
  isArchived: boolean;
  isDeleted: boolean;
  isEmptyCandidate: boolean;
  isAbandoned: boolean;
};

type BulkCleanupBody = {
  action?: unknown;
  gameCodes?: unknown;
};

type CleanupSkipReason = "not_found" | "not_empty_or_active";

type CleanupSkipDetail = {
  gameCode: string;
  reason: CleanupSkipReason;
};

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

function normalizeOrgBranding(value: unknown): {
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
} {
  const branding = value && typeof value === "object" ? (value as OrgBranding) : {};
  return {
    companyName: asNonEmptyString(branding.companyName),
    companyLogoUrl: asNonEmptyString(branding.companyLogoUrl),
    brandAccentColor: asNonEmptyString(branding.brandAccentColor),
    brandThemeLabel: asNonEmptyString(branding.brandThemeLabel),
  };
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const ts = value as Timestamp;
    const date = ts.toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function deriveStatus(game: GameDoc, overview: AnalyticsOverview): string {
  const explicit = asNonEmptyString(overview.status);
  if (explicit) {
    const normalized = explicit.trim().toLowerCase();
    if (normalized === "active") return "in_progress";
    if (normalized === "in_progress") return "in_progress";
    if (normalized === "ended" || normalized === "completed") return "ended";
    if (normalized === "not_started") return "not_started";
  }
  const startedAtIso = timestampToIso(overview.startedAt) ?? timestampToIso(game.startedAt) ?? timestampToIso(game.started);
  const endedAtIso = timestampToIso(overview.endedAt) ?? timestampToIso(game.endedAt) ?? timestampToIso(game.ended);

  const derived = deriveLifecycleStatus({
    started: Boolean(startedAtIso),
    ended: Boolean(endedAtIso),
    startedAtMs: startedAtIso ? new Date(startedAtIso).getTime() : null,
    endedAtMs: endedAtIso ? new Date(endedAtIso).getTime() : null,
  });
  if (derived === "completed") return "ended";
  if (derived === "in_progress") return "in_progress";
  return "not_started";
}

function buildSessionAnalyticsAccess(input: {
  game: GameDoc;
  overview: AnalyticsOverview;
  playerCount: number;
}): SessionAggregate["analyticsAccess"] {
  const endedAtIso = timestampToIso(input.overview.endedAt) ?? timestampToIso(input.game.endedAt);
  const startedAtIso = timestampToIso(input.overview.startedAt) ?? timestampToIso(input.game.startedAt);
  const ended = Boolean(endedAtIso) || asBoolean(input.game.ended);
  const started = Boolean(startedAtIso) || asBoolean(input.game.started);
  if (ended) {
    return {
      visibility: "full_post_session",
      allowedSections: {
        overview: true,
        insights: true,
        playerComparison: true,
        sessionSummary: true,
        exports: true,
      },
      message: null,
    };
  }

  if (started || input.playerCount > 0) {
    return {
      visibility: "limited_live",
      allowedSections: {
        overview: true,
        insights: true,
        playerComparison: true,
        sessionSummary: false,
        exports: false,
      },
      message: "Live metrics are available. Full analytics and exports unlock after the session ends.",
    };
  }

  return {
    visibility: "limited_live",
    allowedSections: {
      overview: true,
      insights: false,
      playerComparison: false,
      sessionSummary: false,
      exports: false,
    },
    message: "Full analytics unlock after the session ends.",
  };
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

function asAnalyticsOverview(value: unknown): AnalyticsOverview {
  if (!value || typeof value !== "object") return {};
  return value as AnalyticsOverview;
}

function asPlayerRows(value: unknown): ManagerDashboardPlayerRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row === "object") as ManagerDashboardPlayerRow[];
}

function isEmptySessionCandidate(input: {
  game: GameDoc;
  overview: AnalyticsOverview;
  playerRows: ManagerDashboardPlayerRow[];
}): boolean {
  const startedAt = timestampToIso(input.overview.startedAt) ?? timestampToIso(input.game.startedAt) ?? timestampToIso(input.game.started);
  const endedAt = timestampToIso(input.overview.endedAt) ?? timestampToIso(input.game.endedAt) ?? timestampToIso(input.game.ended);
  const started = asBoolean(input.game.started);
  const ended = asBoolean(input.game.ended);
  const playerCount = Math.max(
    0,
    asNumber(input.overview.totalPlayers) ?? asNumber((input.overview as Record<string, unknown>).totalPlayers) ?? input.playerRows.length
  );
  return !startedAt && !endedAt && !started && !ended && playerCount === 0;
}

function chunks<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const access = await assertOrgAccess(request.headers.get("authorization"), orgId);
    const [canonicalOrgDoc, legacyOrgDoc] = await Promise.all([
      adminDb.collection("orgs").doc(access.orgId).get(),
      adminDb.collection("organizations").doc(access.orgId).get(),
    ]);
    const orgSourceDoc = canonicalOrgDoc.exists ? canonicalOrgDoc : legacyOrgDoc;
    const orgSourceData = (orgSourceDoc.data() ?? {}) as OrgDoc;
    const orgBranding = normalizeOrgBranding(orgSourceData.branding);
    const orgName = access.orgName ?? asNonEmptyString(orgSourceData.name);
    const entitlements = entitlementsForTier(access.tier);
    if (!hasFeature(access.tier, "orgDashboard")) {
      return NextResponse.json(
        {
          code: "FEATURE_LOCKED",
          message: "Organization dashboard is available on Enterprise tier.",
          org: {
            orgId: access.orgId,
            name: orgName,
            tier: access.tier,
            ownershipSource: access.ownershipSource,
            branding: orgBranding,
          },
          entitlements,
          sessions: [],
          trends: [],
          summary: {
            totalSessions: 0,
            averageSuccessRate: null,
            averageDisputeRate: null,
            averageResolutionTimeMs: null,
          },
        },
        { status: 403 }
      );
    }

    const canonicalOrgGamesSnap = await adminDb.collection("orgs").doc(access.orgId).collection("games").get();
    const legacyOrgGamesSnap = await adminDb.collection("organizations").doc(access.orgId).collection("games").get();

    const linkMap = new Map<
      string,
      {
        createdAt: string | null;
        sourceSessionId: string | null;
        linkSource: SessionIdentitySource;
        isArchived: boolean;
        isDeleted: boolean;
      }
    >();

    const collectLinks = (docs: Array<{ id: string; data: () => OrgGameLinkDoc }>) => {
      for (const doc of docs) {
        const data = (doc.data() ?? {}) as OrgGameLinkDoc;
        const gameCode = asNonEmptyString(data.gameCode) ?? asNonEmptyString(doc.id);
        if (!gameCode) continue;

        const createdAt = timestampToIso(data.createdAt);
        const existing = linkMap.get(gameCode);
        const sourceSessionId = asNonEmptyString(data.sessionId);
        const linkArchived = asBoolean(data.hiddenFromOrgDashboard) || timestampToIso(data.archivedAt) != null;
        const linkDeleted = timestampToIso(data.deletedAt) != null;
        if (!existing || (!existing.createdAt && createdAt) || (!existing.sourceSessionId && sourceSessionId)) {
          linkMap.set(gameCode, {
            createdAt: createdAt ?? existing?.createdAt ?? null,
            sourceSessionId: sourceSessionId ?? existing?.sourceSessionId ?? null,
            linkSource: sourceSessionId ? "org_game_link_session_ref" : "org_game_link_game_code",
            isArchived: linkArchived || existing?.isArchived === true,
            isDeleted: linkDeleted || existing?.isDeleted === true,
          });
        }
      }
    };

    collectLinks(canonicalOrgGamesSnap.docs);
    collectLinks(legacyOrgGamesSnap.docs);

    if (linkMap.size === 0) {
      const fallbackGames = await adminDb.collection("games").where("orgId", "==", access.orgId).limit(100).get();
      for (const gameDoc of fallbackGames.docs) {
        if (!linkMap.has(gameDoc.id)) {
          linkMap.set(gameDoc.id, {
            createdAt: timestampToIso((gameDoc.data() ?? {}).createdAt),
            sourceSessionId: null,
            linkSource: "games_org_fallback",
            isArchived: false,
            isDeleted: false,
          });
        }
      }
    }

    const gameCodes = [...linkMap.keys()];
    const url = new URL(request.url);
    const includeEmpty = ["1", "true", "yes"].includes((url.searchParams.get("includeEmpty") ?? "").trim().toLowerCase());
    const nowMs = Date.now();
    const ABANDONED_AGE_MS = 7 * 24 * 60 * 60 * 1000;

    const gameRefs = gameCodes.map((gameCode) => adminDb.collection("games").doc(gameCode));
    const dashboardRefs = gameCodes.map((gameCode) => adminDb.collection("managerDashboard").doc(gameCode));
    const [gameDocs, dashboardDocs] = await Promise.all([
      gameRefs.length > 0 ? adminDb.getAll(...gameRefs) : Promise.resolve([]),
      dashboardRefs.length > 0 ? adminDb.getAll(...dashboardRefs) : Promise.resolve([]),
    ]);

    const sessions = gameCodes.map((gameCode, index) => {
      const gameDoc = gameDocs[index];
      const dashboardDoc = dashboardDocs[index];
      const game = (gameDoc?.data() ?? {}) as GameDoc;
      const dashboard = (dashboardDoc?.data() ?? {}) as ManagerDashboardDoc;
      const analytics = (dashboard.analytics && typeof dashboard.analytics === "object"
        ? (dashboard.analytics as ManagerDashboardAnalytics)
        : {}) as ManagerDashboardAnalytics;
      const overview = asAnalyticsOverview(analytics.overview);
      const playerRows = asPlayerRows(analytics.playerPerformance);

      const claimsSubmitted = playerRows.reduce((sum, row) => sum + Math.max(0, asNumber(row.claimsSubmitted) ?? 0), 0);
      const claimsConfirmed = playerRows.reduce((sum, row) => sum + Math.max(0, asNumber(row.claimsConfirmed) ?? 0), 0);
      const claimsDenied = playerRows.reduce((sum, row) => sum + Math.max(0, asNumber(row.claimsDenied) ?? 0), 0);

      const claims = claimsSubmitted > 0 ? claimsSubmitted : claimsConfirmed + claimsDenied > 0 ? claimsConfirmed + claimsDenied : null;
      const disputes = claimsDenied > 0 ? claimsDenied : claims ? 0 : null;
      const successRate = asNumber(overview.successRate) ?? (claims != null && claims > 0 ? (claimsConfirmed / claims) * 100 : null);
      const disputeRate = asNumber(overview.disputeRate) ?? (claims != null && claims > 0 && disputes != null ? (disputes / claims) * 100 : null);
      const avgResolutionTimeMs = asNumber(overview.averageResolutionTimeMs) ?? asNumber(analytics.averageResolutionTimeMs);
      const playerCount = Math.max(
        0,
        asNumber(overview.totalPlayers) ?? asNumber((analytics as Record<string, unknown>).totalPlayers) ?? playerRows.length
      );
      const linkMeta = linkMap.get(gameCode);
      const isArchived = (linkMeta?.isArchived ?? false) || asBoolean(game.hiddenFromOrgDashboard) || timestampToIso(game.archivedAt) != null;
      const isDeleted = (linkMeta?.isDeleted ?? false) || timestampToIso(game.deletedAt) != null;
      const isEmptyCandidate = isEmptySessionCandidate({ game, overview, playerRows });
      const createdAt = linkMap.get(gameCode)?.createdAt ?? timestampToIso(game.createdAt);
      const createdAtMs = createdAt ? new Date(createdAt).getTime() : Number.NaN;
      const isAbandoned = isEmptyCandidate && Number.isFinite(createdAtMs) && nowMs - createdAtMs >= ABANDONED_AGE_MS;

      const sourceSessionId = linkMap.get(gameCode)?.sourceSessionId ?? null;
      const identitySource = linkMap.get(gameCode)?.linkSource ?? "games_org_fallback";
      const sessionType: "real" | "virtual" = sourceSessionId ? "real" : "virtual";
      const identity = makeSessionIdentityMetadata({
        orgId: access.orgId,
        identitySource,
        sourceSessionId,
        gameCodes: [gameCode],
      });
      const session: SessionAggregate = {
        sessionId: makeBusinessSessionGroupId({
          type: sessionType,
          orgId: access.orgId,
          sessionKey: sessionType === "real" ? `session:${sourceSessionId ?? "missing"}` : `game:${gameCode}`,
        }),
        sessionType,
        sourceSessionId,
        ...identity,
        gameCode,
        gameCodes: [gameCode],
        status: deriveStatus(game, overview),
        createdAt,
        startedAt: timestampToIso(overview.startedAt) ?? timestampToIso(game.startedAt) ?? timestampToIso(game.started),
        endedAt: timestampToIso(overview.endedAt) ?? timestampToIso(game.endedAt) ?? timestampToIso(game.ended),
        playerCount,
        claims,
        disputes,
        successRate,
        disputeRate,
        avgResolutionTimeMs,
        analyticsAccess: buildSessionAnalyticsAccess({
          game,
          overview,
          playerCount,
        }),
        isArchived,
        isDeleted,
        isEmptyCandidate,
        isAbandoned,
      };

      return session;
    });

    sessions.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const visibleSessions = includeEmpty
      ? sessions.filter((session) => !session.isArchived && !session.isDeleted)
      : sessions.filter((session) => !session.isArchived && !session.isDeleted && !session.isAbandoned);

    const average = (values: number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    const successRates = visibleSessions
      .map((session) => session.successRate)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const disputeRates = visibleSessions
      .map((session) => session.disputeRate)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const resolutionTimes = visibleSessions
      .map((session) => session.avgResolutionTimeMs)
      .filter((value): value is number => value != null && Number.isFinite(value));

    return NextResponse.json({
      org: {
        orgId: access.orgId,
        name: orgName,
        tier: access.tier,
        ownershipSource: access.ownershipSource,
        branding: orgBranding,
      },
      entitlements,
      summary: {
        totalSessions: visibleSessions.length,
        hiddenStaleSessionCount: sessions.filter((session) => session.isAbandoned && !session.isArchived && !session.isDeleted).length,
        averageSuccessRate: average(successRates),
        averageDisputeRate: average(disputeRates),
        averageResolutionTimeMs: average(resolutionTimes),
      },
      trends: visibleSessions.slice(0, 12).map((session, index) => ({
        index: index + 1,
        gameCode: session.gameCode,
        createdAt: session.createdAt,
        successRate: session.successRate,
        disputeRate: session.disputeRate,
        avgResolutionTimeMs: session.avgResolutionTimeMs,
        analyticsAccess: session.analyticsAccess,
      })),
      sessions: visibleSessions,
    });
  } catch (error) {
    if (error instanceof OrgUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before accessing this organization." }, { status: 401 });
    }

    if (error instanceof OrgForbiddenError) {
      return NextResponse.json({ code: "FORBIDDEN", message: "This account cannot access this organization." }, { status: 403 });
    }

    if (error instanceof OrgNotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Organization not found." }, { status: 404 });
    }

    if (error instanceof OrgAccessInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[org:sessions] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load organization sessions." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const access = await assertOrgAccess(request.headers.get("authorization"), orgId);
    const body = (await request.json().catch(() => ({}))) as BulkCleanupBody;
    const action = asNonEmptyString(body.action)?.toLowerCase();
    if (action !== "archive_selected_empty" && action !== "delete_selected_empty") {
      return NextResponse.json({ code: "BAD_REQUEST", message: "Unsupported cleanup action." }, { status: 400 });
    }

    const selected = Array.isArray(body.gameCodes)
      ? body.gameCodes
          .map((value) => asNonEmptyString(value))
          .filter((value): value is string => value != null)
          .map((value) => value.trim().toUpperCase())
      : [];
    if (selected.length === 0) {
      return NextResponse.json({ code: "BAD_REQUEST", message: "At least one game code is required." }, { status: 400 });
    }

    const uniqueCodes = [...new Set(selected)];
    const gameRefs = uniqueCodes.map((gameCode) => adminDb.collection("games").doc(gameCode));
    const canonicalLinkRefs = uniqueCodes.map((gameCode) => adminDb.collection("orgs").doc(access.orgId).collection("games").doc(gameCode));
    const legacyLinkRefs = uniqueCodes.map((gameCode) => adminDb.collection("organizations").doc(access.orgId).collection("games").doc(gameCode));
    const dashboardRefs = uniqueCodes.map((gameCode) => adminDb.collection("managerDashboard").doc(gameCode));
    const [gameDocs, canonicalLinkDocs, legacyLinkDocs, dashboardDocs] = await Promise.all([
      gameRefs.length > 0 ? adminDb.getAll(...gameRefs) : Promise.resolve([]),
      canonicalLinkRefs.length > 0 ? adminDb.getAll(...canonicalLinkRefs) : Promise.resolve([]),
      legacyLinkRefs.length > 0 ? adminDb.getAll(...legacyLinkRefs) : Promise.resolve([]),
      dashboardRefs.length > 0 ? adminDb.getAll(...dashboardRefs) : Promise.resolve([]),
    ]);

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const eligibleCodes: string[] = [];
    const skippedDetails: CleanupSkipDetail[] = [];
    const existingGameCodes = new Set<string>();
    const canonicalLinkCodes = new Set<string>();
    const legacyLinkCodes = new Set<string>();

    for (let index = 0; index < uniqueCodes.length; index += 1) {
      const gameCode = uniqueCodes[index] ?? "";
      const gameDoc = gameDocs[index];
      const canonicalLinkDoc = canonicalLinkDocs[index];
      const legacyLinkDoc = legacyLinkDocs[index];
      const hasGameDoc = Boolean(gameDoc?.exists);
      const hasCanonicalLink = Boolean(canonicalLinkDoc?.exists);
      const hasLegacyLink = Boolean(legacyLinkDoc?.exists);
      if (!hasGameDoc && !hasCanonicalLink && !hasLegacyLink) {
        skippedDetails.push({ gameCode, reason: "not_found" });
        continue;
      }
      if (hasGameDoc) existingGameCodes.add(gameCode);
      if (hasCanonicalLink) canonicalLinkCodes.add(gameCode);
      if (hasLegacyLink) legacyLinkCodes.add(gameCode);
      const game = (gameDoc.data() ?? {}) as GameDoc;
      const dashboard = (dashboardDocs[index]?.data() ?? {}) as ManagerDashboardDoc;
      const analytics = dashboard.analytics && typeof dashboard.analytics === "object" ? (dashboard.analytics as ManagerDashboardAnalytics) : {};
      const overview = asAnalyticsOverview(analytics.overview);
      const playerRows = asPlayerRows(analytics.playerPerformance);
      const emptyCandidate = isEmptySessionCandidate({ game, overview, playerRows });
      if (!emptyCandidate) {
        skippedDetails.push({
          gameCode,
          reason: "not_empty_or_active",
        });
        continue;
      }
      eligibleCodes.push(gameCode);
    }

    if (eligibleCodes.length === 0) {
      return NextResponse.json({
        ok: true,
        action,
        updatedCount: 0,
        updatedCodes: [] as string[],
        skippedCount: skippedDetails.length,
        skippedCodes: skippedDetails.map((entry) => entry.gameCode),
        skippedDetails,
      });
    }

    const updatePayload =
      action === "archive_selected_empty"
        ? {
            hiddenFromOrgDashboard: true,
            archivedAt: nowIso,
            archivedByAccountId: access.uid,
            updatedAt: nowIso,
          }
        : {
            hiddenFromOrgDashboard: true,
            deletedAt: nowIso,
            deletedByAccountId: access.uid,
            deletedReason: "manager_cleanup_empty",
            updatedAt: nowIso,
          };

    for (const group of chunks(eligibleCodes, 400)) {
      const batch = adminDb.batch();
      for (const gameCode of group) {
        if (existingGameCodes.has(gameCode)) {
          batch.set(adminDb.collection("games").doc(gameCode), updatePayload, { merge: true });
        }
        if (canonicalLinkCodes.has(gameCode)) {
          batch.set(adminDb.collection("orgs").doc(access.orgId).collection("games").doc(gameCode), updatePayload, { merge: true });
        }
        if (legacyLinkCodes.has(gameCode)) {
          batch.set(adminDb.collection("organizations").doc(access.orgId).collection("games").doc(gameCode), updatePayload, { merge: true });
        }
      }
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      action,
      updatedCount: eligibleCodes.length,
      updatedCodes: eligibleCodes,
      skippedCount: skippedDetails.length,
      skippedCodes: skippedDetails.map((entry) => entry.gameCode),
      skippedDetails,
      processedAt: nowMs,
    });
  } catch (error) {
    if (error instanceof OrgUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before accessing this organization." }, { status: 401 });
    }
    if (error instanceof OrgForbiddenError) {
      return NextResponse.json({ code: "FORBIDDEN", message: "This account cannot access this organization." }, { status: 403 });
    }
    if (error instanceof OrgNotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Organization not found." }, { status: 404 });
    }
    if (error instanceof OrgAccessInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[org:sessions:cleanup] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to clean up organization sessions." }, { status: 500 });
  }
}
