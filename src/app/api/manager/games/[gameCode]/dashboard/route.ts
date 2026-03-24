import { NextResponse } from "next/server";
import { FieldPath, type Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import {
  deriveLifecycleStatus,
  eventLabel,
  normalizePlayerAggregate,
  pickFirstNumber,
  type AnalyticsAccess,
  type AnalyticsVisibility,
} from "@/lib/analytics/manager-dashboard";
import { entitlementsForTier, type ProductTier } from "@/lib/product/entitlements";
import { resolveOrganizationTier } from "@/lib/product/org-tier";
import {
  assertManagerAccessForGame,
  ManagerAccessInfrastructureError,
  ManagerForbiddenError,
  ManagerGameNotFoundError,
  ManagerUnauthenticatedError,
} from "@/lib/manager/access";

export const runtime = "nodejs";

type GameDoc = {
  name?: unknown;
  status?: unknown;
  mode?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  started?: unknown;
  ended?: unknown;
  analyticsVisibility?: unknown;
  analyticsAccess?: unknown;
};

type PlayerAnalyticsDoc = {
  playerId?: unknown;
  userId?: unknown;
  displayName?: unknown;
  gameCode?: unknown;
  gameId?: unknown;
  eventsTotal?: unknown;
  eventCounts?: unknown;
  kills?: unknown;
  deaths?: unknown;
  deathCount?: unknown;
  deniedCount?: unknown;
  disputeCount?: unknown;
  claimCount?: unknown;
  claimsCount?: unknown;
  totalClaims?: unknown;
  confirmedCount?: unknown;
  convertedClaimCount?: unknown;
  convertedCount?: unknown;
  confirmedAgainst?: unknown;
  confirmedAgainstCount?: unknown;
  claimsAgainstConfirmed?: unknown;
  claimsConfirmedAgainst?: unknown;
  eliminationDeaths?: unknown;
  eliminationDeathCount?: unknown;
  successRate?: unknown;
  accuracy?: unknown;
  accuracyPct?: unknown;
  sessions?: unknown;
  sessionCount?: unknown;
  updatedAt?: unknown;
};

type AnalyticsEventDoc = {
  eventType?: unknown;
  type?: unknown;
};

type GamePlayerDoc = {
  name?: unknown;
  displayName?: unknown;
  alive?: unknown;
  removedAt?: unknown;
  deathCount?: unknown;
  deaths?: unknown;
  killCount?: unknown;
  kills?: unknown;
};

type GameClaimDoc = {
  killer?: unknown;
  killerId?: unknown;
  victim?: unknown;
  victimId?: unknown;
  status?: unknown;
};

type OrgBranding = {
  companyName?: unknown;
  companyLogoUrl?: unknown;
  brandAccentColor?: unknown;
  brandThemeLabel?: unknown;
};

type OrgDoc = {
  branding?: unknown;
  name?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBrandingFromOrg(data: OrgDoc): {
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
} {
  const branding = (data.branding && typeof data.branding === "object" ? data.branding : {}) as OrgBranding;
  const companyName = asNonEmptyString(branding.companyName) ?? asNonEmptyString(data.name);
  const companyLogoUrl = asNonEmptyString(branding.companyLogoUrl);
  const brandAccentColor = asNonEmptyString(branding.brandAccentColor);
  const brandThemeLabel = asNonEmptyString(branding.brandThemeLabel);
  return {
    companyName,
    companyLogoUrl,
    brandAccentColor,
    brandThemeLabel,
  };
}

async function resolveOrgBranding(orgId: string): Promise<{
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
}> {
  const canonical = await adminDb.collection("orgs").doc(orgId).get();
  if (canonical.exists) {
    return normalizeBrandingFromOrg((canonical.data() ?? {}) as OrgDoc);
  }
  const legacy = await adminDb.collection("organizations").doc(orgId).get();
  if (legacy.exists) {
    return normalizeBrandingFromOrg((legacy.data() ?? {}) as OrgDoc);
  }
  return {
    companyName: null,
    companyLogoUrl: null,
    brandAccentColor: null,
    brandThemeLabel: null,
  };
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as Timestamp).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function toUpperTrimmed(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeMode(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

type InsightTrigger = {
  metric: string;
  actual: number;
  expected: number;
  comparator: "<" | "<=" | ">" | ">=" | "=";
};

type DashboardInsight = {
  label: string;
  value: number;
  message: string;
  triggeredBy?: InsightTrigger[];
};

function normalizeVisibility(value: unknown): AnalyticsVisibility | null {
  const normalized = asString(value)?.toLowerCase();
  if (!normalized) return null;
  if (normalized === "limited_live" || normalized === "limited") return "limited_live";
  if (normalized === "full_post_session" || normalized === "full" || normalized === "post_game_full") return "full_post_session";
  return null;
}

function normalizeAllowedSections(value: unknown): AnalyticsAccess["allowedSections"] | null {
  if (!value || typeof value !== "object") return null;
  const section = value as Record<string, unknown>;
  return {
    overview: asBoolean(section.overview) ?? false,
    insights: asBoolean(section.insights) ?? false,
    playerComparison: asBoolean(section.playerComparison) ?? false,
    sessionSummary: asBoolean(section.sessionSummary) ?? false,
    exports: asBoolean(section.exports) ?? false,
  };
}

function isClaimConfirmed(status: string | null): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  return ["resolved", "confirmed", "approved", "accepted"].includes(normalized);
}

function isClaimDenied(status: string | null): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  return ["rejected", "denied", "disputed", "cancelled", "expired"].includes(normalized);
}

function buildLiveAnalyticsFromCanonical(input: {
  playersSnap: FirebaseFirestore.QuerySnapshot;
  claimsSnap: FirebaseFirestore.QuerySnapshot;
  gameEventsSnap: FirebaseFirestore.QuerySnapshot;
  normalizedMode: string;
}) {
  const perEventTotals = new Map<string, number>();
  const claimsByKiller = new Map<string, number>();
  const confirmedByKiller = new Map<string, number>();
  const confirmedAgainstPlayer = new Map<string, number>();
  const playersById = new Map<string, { playerId: string; displayName: string; alive: boolean | null; deathsFromDoc: number | null; killsFromDoc: number | null }>();
  const playersByName = new Map<string, string>();

  for (const playerDoc of input.playersSnap.docs) {
    const data = (playerDoc.data() ?? {}) as GamePlayerDoc;
    const playerId = playerDoc.id;
    const displayName = asString(data.displayName) ?? asString(data.name) ?? playerId;
    const alive = asBoolean(data.alive);
    const deathsFromDoc = pickFirstNumber(data.deaths, data.deathCount);
    const killsFromDoc = pickFirstNumber(data.kills, data.killCount);
    playersById.set(playerId, { playerId, displayName, alive, deathsFromDoc, killsFromDoc });
    playersByName.set(playerId.trim().toLowerCase(), playerId);
    playersByName.set(displayName.trim().toLowerCase(), playerId);
  }

  for (const claimDoc of input.claimsSnap.docs) {
    const data = (claimDoc.data() ?? {}) as GameClaimDoc;
    const status = asString(data.status);
    const killerRaw = asString(data.killerId) ?? asString(data.killer);
    const victimRaw = asString(data.victimId) ?? asString(data.victim);
    const killerKey = killerRaw?.trim().toLowerCase() ?? null;
    const victimKey = victimRaw?.trim().toLowerCase() ?? null;
    const killerId = killerKey ? (playersByName.get(killerKey) ?? killerRaw ?? null) : null;
    const victimId = victimKey ? (playersByName.get(victimKey) ?? victimRaw ?? null) : null;

    perEventTotals.set("kill_claim", (perEventTotals.get("kill_claim") ?? 0) + 1);

    if (killerId) {
      claimsByKiller.set(killerId, (claimsByKiller.get(killerId) ?? 0) + 1);
    }

    if (isClaimConfirmed(status)) {
      perEventTotals.set("admin_confirm_kill_claim", (perEventTotals.get("admin_confirm_kill_claim") ?? 0) + 1);
      if (killerId) {
        confirmedByKiller.set(killerId, (confirmedByKiller.get(killerId) ?? 0) + 1);
      }
      if (victimId) {
        confirmedAgainstPlayer.set(victimId, (confirmedAgainstPlayer.get(victimId) ?? 0) + 1);
      }
    } else if (isClaimDenied(status)) {
      perEventTotals.set("admin_deny_kill_claim", (perEventTotals.get("admin_deny_kill_claim") ?? 0) + 1);
    }
  }

  for (const eventDoc of input.gameEventsSnap.docs) {
    const data = (eventDoc.data() ?? {}) as AnalyticsEventDoc;
    const eventType = asString(data.eventType) ?? asString(data.type);
    if (!eventType) continue;
    perEventTotals.set(eventType, (perEventTotals.get(eventType) ?? 0) + 1);
  }

  const playerPerformance = [...playersById.values()].map((player) => {
    const claimCount = claimsByKiller.get(player.playerId) ?? 0;
    const killsFromClaims = confirmedByKiller.get(player.playerId) ?? 0;
    const kills = player.killsFromDoc ?? (killsFromClaims > 0 ? killsFromClaims : null);
    const deathsFromClaims = confirmedAgainstPlayer.get(player.playerId) ?? 0;
    const deathsByMode =
      input.normalizedMode === "classic"
        ? deathsFromClaims
        : pickFirstNumber(player.deathsFromDoc, deathsFromClaims, player.alive === false ? 1 : 0) ?? 0;
    const accuracyPct = claimCount > 0 ? Number(((killsFromClaims / claimCount) * 100).toFixed(1)) : null;

    return {
      playerId: player.playerId,
      displayName: player.displayName,
      kills,
      deaths: deathsByMode,
      kdRatio: kills != null ? Number((kills / Math.max(deathsByMode, 1)).toFixed(2)) : null,
      accuracyPct,
      sessionCount: 1,
    };
  });

  return {
    perEventTotals,
    playerPerformance,
    totalPlayers: playersById.size,
    totalSessions: playersById.size > 0 ? 1 : 0,
  };
}

async function queryPlayerAnalyticsByCode(normalizedCode: string) {
  const snapshots = await Promise.all([
    adminDb.collection("playerAnalytics").where("gameCode", "==", normalizedCode).get(),
    adminDb.collection("playerAnalytics").where("gameId", "==", normalizedCode).get(),
    adminDb.collection("playerAnalytics").orderBy(FieldPath.documentId()).startAt(`${normalizedCode}_`).endAt(`${normalizedCode}_\uf8ff`).get(),
    adminDb.collection("playerAnalytics").orderBy(FieldPath.documentId()).startAt(`${normalizedCode}:`).endAt(`${normalizedCode}:\uf8ff`).get(),
    adminDb.collection("playerAnalytics").orderBy(FieldPath.documentId()).startAt(`${normalizedCode}-`).endAt(`${normalizedCode}-\uf8ff`).get(),
  ]);

  const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      byId.set(doc.id, doc);
    }
  }
  return [...byId.values()];
}

export async function GET(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const { gameCode } = await params;
    const normalizedCode = toUpperTrimmed(gameCode);
    const access = await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);
    const gameSnapshot = await adminDb.collection("games").doc(normalizedCode).get();
    const gameData = (gameSnapshot.data() ?? {}) as { orgId?: unknown };
    const orgId = typeof gameData.orgId === "string" ? gameData.orgId.trim() : "";
    const tier: ProductTier = orgId ? await resolveOrganizationTier(orgId) : "basic";
    const branding = orgId ? await resolveOrgBranding(orgId) : null;

    const game = (gameSnapshot.data() ?? {}) as GameDoc;
    const mode = asString(game.mode);
    const normalizedMode = normalizeMode(mode);
    const gameRef = adminDb.collection("games").doc(normalizedCode);

    const [playerAnalyticsDocs, analyticsEventsSnap, playersSnap, claimsSnap, gameEventsSnap] = await Promise.all([
      queryPlayerAnalyticsByCode(normalizedCode),
      adminDb.collection("analyticsEvents").where("gameCode", "==", normalizedCode).limit(500).get(),
      gameRef.collection("players").get(),
      gameRef.collection("claims").get(),
      adminDb.collection("gameEvents").doc(normalizedCode).collection("events").orderBy("createdAt", "desc").limit(500).get(),
    ]);
    const hasPlayerAnalytics = playerAnalyticsDocs.length > 0;
    const perEventTotals = new Map<string, number>();
    const playerPerformance = playerAnalyticsDocs.map((doc) => {
      const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
      const eventCounts =
        data.eventCounts && typeof data.eventCounts === "object" ? (data.eventCounts as Record<string, unknown>) : {};
      for (const [eventType, rawCount] of Object.entries(eventCounts)) {
        const count = asNumber(rawCount) ?? 0;
        perEventTotals.set(eventType, (perEventTotals.get(eventType) ?? 0) + count);
      }
      const claimCount = pickFirstNumber(
        data.claimCount,
        data.claimsCount,
        data.totalClaims,
        eventCounts.kill_claim,
        eventCounts.kill_claim_submitted,
        eventCounts.admin_confirm_kill_claim
      );
      const deniedCount = pickFirstNumber(data.deniedCount, data.disputeCount, eventCounts.admin_deny_kill_claim, eventCounts.kill_claim_denied);
      const normalized = normalizePlayerAggregate({
        row: data,
        fallbackPlayerId: doc.id,
        normalizedMode,
      });
      if (deniedCount != null) {
        perEventTotals.set("admin_deny_kill_claim", (perEventTotals.get("admin_deny_kill_claim") ?? 0) + deniedCount);
      }
      if (claimCount != null && !eventCounts.kill_claim) {
        perEventTotals.set("kill_claim", (perEventTotals.get("kill_claim") ?? 0) + claimCount);
      }
      if (normalized.kills != null && !eventCounts.admin_confirm_kill_claim) {
        perEventTotals.set("admin_confirm_kill_claim", (perEventTotals.get("admin_confirm_kill_claim") ?? 0) + normalized.kills);
      }
      return {
        playerId: normalized.playerId,
        displayName: normalized.displayName,
        kills: normalized.kills,
        deaths: normalized.deaths,
        kdRatio: normalized.kdRatio,
        accuracyPct: normalized.accuracyPct,
        sessionCount: normalized.sessionCount,
      };
    });

    if (!hasPlayerAnalytics) {
      for (const doc of analyticsEventsSnap.docs) {
        const data = (doc.data() ?? {}) as AnalyticsEventDoc;
        const eventType = asString(data.eventType) ?? asString(data.type);
        if (!eventType) continue;
        perEventTotals.set(eventType, (perEventTotals.get(eventType) ?? 0) + 1);
      }
    }

    const liveAnalytics = buildLiveAnalyticsFromCanonical({
      playersSnap,
      claimsSnap,
      gameEventsSnap,
      normalizedMode,
    });

    const totalEventsFromPlayers = playerAnalyticsDocs.reduce((sum, doc) => {
      const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
      return sum + (asNumber(data.eventsTotal) ?? 0);
    }, 0);
    const totalEventsFromCounts = [...perEventTotals.values()].reduce((sum, value) => sum + value, 0);
    const liveTotalEventsFromCounts = [...liveAnalytics.perEventTotals.values()].reduce((sum, value) => sum + value, 0);
    const startedAt = toIso(game.startedAt) ?? toIso(game.started);
    const endedAt = toIso(game.endedAt) ?? toIso(game.ended);
    const started = asBoolean(game.started) ?? startedAt != null;
    const ended = asBoolean(game.ended) ?? endedAt != null;
    const lifecycleStatus = deriveLifecycleStatus({
      started,
      ended,
      startedAtMs: startedAt ? new Date(startedAt).getTime() : null,
      endedAtMs: endedAt ? new Date(endedAt).getTime() : null,
    });
    const tierEntitlements = entitlementsForTier(tier);
    const analyticsAccessFromDoc =
      game.analyticsAccess && typeof game.analyticsAccess === "object"
        ? (game.analyticsAccess as Record<string, unknown>)
        : null;
    const explicitVisibility =
      normalizeVisibility(analyticsAccessFromDoc?.visibility) ??
      normalizeVisibility(game.analyticsVisibility);
    const visibility: AnalyticsVisibility = explicitVisibility ?? (ended ? "full_post_session" : "limited_live");
    const fallbackAllowedSections: AnalyticsAccess["allowedSections"] =
      visibility === "full_post_session"
        ? {
            overview: true,
            insights: tierEntitlements.managerInsights,
            playerComparison: true,
            sessionSummary: tierEntitlements.managerSummaries,
            exports: tierEntitlements.exports,
          }
        : {
            overview: true,
            insights: false,
            playerComparison: false,
            sessionSummary: false,
            exports: false,
          };
    const analyticsAccess: AnalyticsAccess = {
      visibility,
      allowedSections: normalizeAllowedSections(analyticsAccessFromDoc?.allowedSections) ?? fallbackAllowedSections,
      message:
        asString(analyticsAccessFromDoc?.message) ??
        (visibility === "limited_live" ? "Full analytics unlock after the session ends." : null),
    };
    const updatedAt = toIso(
      playerAnalyticsDocs
        .map((doc) => ((doc.data() ?? {}) as PlayerAnalyticsDoc).updatedAt)
        .find((value) => value != null) ?? null
    );
    const aggregatedUpdatedAtMs = updatedAt ? new Date(updatedAt).getTime() : null;
    const aggregatesStale =
      lifecycleStatus === "in_progress" &&
      (aggregatedUpdatedAtMs == null || Date.now() - aggregatedUpdatedAtMs > 2 * 60 * 1000);
    const useLiveFallback = !hasPlayerAnalytics || aggregatesStale;
    const mergedEventTotals = useLiveFallback
      ? new Map<string, number>([...perEventTotals.entries(), ...liveAnalytics.perEventTotals.entries()])
      : perEventTotals;
    const effectivePlayerPerformance = useLiveFallback && liveAnalytics.playerPerformance.length > 0 ? liveAnalytics.playerPerformance : playerPerformance;
    const totalEvents =
      totalEventsFromPlayers > 0 && !useLiveFallback
        ? totalEventsFromPlayers
        : Math.max(totalEventsFromCounts, liveTotalEventsFromCounts, totalEventsFromPlayers);
    const effectiveTotalPlayers = Math.max(playerAnalyticsDocs.length, liveAnalytics.totalPlayers);
    const effectiveTotalSessions = Math.max(playerAnalyticsDocs.length > 0 ? 1 : 0, liveAnalytics.totalSessions);
    const insights: DashboardInsight[] = [...mergedEventTotals.entries()]
      .map(([eventType, value]) => ({ label: eventLabel(eventType), value, message: `${eventLabel(eventType)} occurred ${value} times.` }))
      .sort((a, b) => b.value - a.value);
    const claims = mergedEventTotals.get("admin_confirm_kill_claim") ?? mergedEventTotals.get("kill_claim") ?? null;
    const disputes = mergedEventTotals.get("admin_deny_kill_claim") ?? mergedEventTotals.get("kill_claim_denied") ?? null;
    const disputeRate = claims != null && claims > 0 && disputes != null ? (disputes / claims) * 100 : null;
    if (claims != null) insights.unshift({ label: "Claims", value: claims, message: `Players submitted ${claims} kill claims.` });
    if (disputes != null) insights.unshift({ label: "Disputes", value: disputes, message: `${disputes} claims were disputed.` });
    if (disputeRate != null) {
      const normalizedRate = Number(disputeRate.toFixed(1));
      const expectedDisputeRate = 30;
      insights.unshift({
        label: "Dispute Rate",
        value: normalizedRate,
        message:
          normalizedRate > expectedDisputeRate
            ? "Dispute rate is above the expected threshold."
            : "Dispute rate is within the expected threshold.",
        triggeredBy: [
          {
            metric: "Dispute rate",
            actual: normalizedRate,
            expected: expectedDisputeRate,
            comparator: "<",
          },
        ],
      });
    }

    return NextResponse.json({
      gameCode: normalizedCode,
      tier,
      entitlements: tierEntitlements,
      ownershipSource: access.ownershipSource,
      branding,
      analyticsAccess,
      analytics: {
        overview: {
          gameCode: normalizedCode,
          gameName: asString(game.name) ?? normalizedCode,
          status: lifecycleStatus,
          mode,
          startedAt,
          endedAt,
          totalPlayers: effectiveTotalPlayers,
          activePlayers: effectiveTotalPlayers,
          totalSessions: effectiveTotalSessions,
        },
        insights,
        playerPerformance: effectivePlayerPerformance,
        sessionSummary: {
          totalSessions: effectiveTotalSessions,
          avgSessionLengthSeconds: null,
          longestSessionSeconds: null,
          lastSessionAt: endedAt ?? startedAt,
        },
        eventTotals: Object.fromEntries(mergedEventTotals.entries()),
        totalEvents,
        updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof ManagerUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in before opening this manager dashboard.",
        },
        { status: 401 }
      );
    }

    if (error instanceof ManagerForbiddenError) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: error.message || "This account is not authorized to manage this game.",
        },
        { status: 403 }
      );
    }

    if (error instanceof ManagerGameNotFoundError) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Game not found.",
        },
        { status: 404 }
      );
    }

    if (error instanceof ManagerAccessInfrastructureError) {
      return NextResponse.json(
        {
          code: "AUTH_VERIFICATION_FAILED",
          message: "Server could not verify Firebase auth.",
        },
        { status: 500 }
      );
    }

    console.error("[manager:dashboard] Failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to load manager dashboard.",
      },
      { status: 500 }
    );
  }
}
