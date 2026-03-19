import { NextResponse } from "next/server";
import { FieldPath, type Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
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

function eventLabel(eventType: string): string {
  const normalized = eventType.trim().toLowerCase();
  const labelMap: Record<string, string> = {
    game_started: "Game Started",
    game_ended: "Game Ended",
    admin_confirm_kill_claim: "Admin Confirm Kill Claim",
    admin_deny_kill_claim: "Admin Deny Kill Claim",
  };
  if (labelMap[normalized]) return labelMap[normalized];
  return normalized
    .split("_")
    .filter((token) => token.length > 0)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function pickFirstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function toUpperTrimmed(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeMode(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

type AnalyticsVisibility = "limited_live" | "full_post_session";

type AnalyticsAccess = {
  visibility: AnalyticsVisibility;
  allowedSections: {
    overview: boolean;
    insights: boolean;
    playerComparison: boolean;
    sessionSummary: boolean;
    exports: boolean;
  };
  message: string | null;
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

    const [playerAnalyticsDocs, analyticsEventsSnap] = await Promise.all([
      queryPlayerAnalyticsByCode(normalizedCode),
      adminDb.collection("analyticsEvents").where("gameCode", "==", normalizedCode).limit(500).get(),
    ]);
    const hasPlayerAnalytics = playerAnalyticsDocs.length > 0;
    const hasAnalyticsEvents = !analyticsEventsSnap.empty;
    if (!hasPlayerAnalytics && !hasAnalyticsEvents) {
      return NextResponse.json(
        {
          code: "ANALYTICS_NOT_FOUND",
          message: "Game exists, but aggregated analytics are not generated yet.",
        },
        { status: 404 }
      );
    }

    const game = (gameSnapshot.data() ?? {}) as GameDoc;
    const mode = asString(game.mode);
    const normalizedMode = normalizeMode(mode);
    const perEventTotals = new Map<string, number>();
    const playerPerformance = playerAnalyticsDocs.map((doc) => {
      const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
      const playerId = asString(data.playerId) ?? asString(data.userId) ?? doc.id;
      const displayName = asString(data.displayName) ?? playerId;
      const eventCounts =
        data.eventCounts && typeof data.eventCounts === "object" ? (data.eventCounts as Record<string, unknown>) : {};
      for (const [eventType, rawCount] of Object.entries(eventCounts)) {
        const count = asNumber(rawCount) ?? 0;
        perEventTotals.set(eventType, (perEventTotals.get(eventType) ?? 0) + count);
      }
      const confirmedCount = pickFirstNumber(
        data.confirmedCount,
        data.convertedClaimCount,
        data.convertedCount,
        eventCounts.admin_confirm_kill_claim,
        eventCounts.kill_claim_confirmed
      );
      const claimCount = pickFirstNumber(
        data.claimCount,
        data.claimsCount,
        data.totalClaims,
        eventCounts.kill_claim,
        eventCounts.kill_claim_submitted,
        eventCounts.admin_confirm_kill_claim
      );
      const kills = pickFirstNumber(data.kills, confirmedCount);
      const eliminationDeaths = pickFirstNumber(
        data.eliminationDeaths,
        data.eliminationDeathCount,
        data.deaths,
        data.deathCount,
        eventCounts.elimination_death,
        eventCounts.eliminated,
        eventCounts.death
      );
      const confirmedAgainst = pickFirstNumber(
        data.confirmedAgainst,
        data.confirmedAgainstCount,
        data.claimsAgainstConfirmed,
        data.claimsConfirmedAgainst,
        eventCounts.confirmed_against,
        eventCounts.admin_confirm_kill_claim_against,
        eventCounts.kill_claim_confirmed_against,
        eventCounts.victim_confirmed_claim
      );
      const deniedCount = pickFirstNumber(data.deniedCount, data.disputeCount, eventCounts.admin_deny_kill_claim, eventCounts.kill_claim_denied);
      const successRate = pickFirstNumber(data.successRate, data.accuracy, data.accuracyPct);
      const sessionCount = pickFirstNumber(data.sessionCount, data.sessions, data.eventsTotal != null || claimCount != null ? 1 : null);
      const accuracyPct = successRate ?? (confirmedCount != null && claimCount != null && claimCount > 0 ? (confirmedCount / claimCount) * 100 : null);
      const kdDenominator = normalizedMode === "classic" ? confirmedAgainst : normalizedMode === "elimination" ? eliminationDeaths : pickFirstNumber(eliminationDeaths, confirmedAgainst);
      const deaths = kdDenominator;
      const kdRatio =
        kills != null
          ? kdDenominator != null && kdDenominator > 0
            ? kills / kdDenominator
            : kdDenominator === 0
              ? kills > 0
                ? kills
                : null
              : null
          : null;
      if (deniedCount != null) {
        perEventTotals.set("admin_deny_kill_claim", (perEventTotals.get("admin_deny_kill_claim") ?? 0) + deniedCount);
      }
      if (claimCount != null && !eventCounts.kill_claim) {
        perEventTotals.set("kill_claim", (perEventTotals.get("kill_claim") ?? 0) + claimCount);
      }
      if (confirmedCount != null && !eventCounts.admin_confirm_kill_claim) {
        perEventTotals.set("admin_confirm_kill_claim", (perEventTotals.get("admin_confirm_kill_claim") ?? 0) + confirmedCount);
      }
      return {
        playerId,
        displayName,
        kills,
        deaths,
        kdRatio,
        accuracyPct,
        sessionCount,
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

    const totalEventsFromPlayers = playerAnalyticsDocs.reduce((sum, doc) => {
      const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
      return sum + (asNumber(data.eventsTotal) ?? 0);
    }, 0);
    const totalEventsFromCounts = [...perEventTotals.values()].reduce((sum, value) => sum + value, 0);
    const totalEvents = totalEventsFromPlayers > 0 ? totalEventsFromPlayers : totalEventsFromCounts;
    const startedAt = toIso(game.startedAt) ?? toIso(game.started);
    const endedAt = toIso(game.endedAt) ?? toIso(game.ended);
    const started = asBoolean(game.started) ?? startedAt != null;
    const ended = asBoolean(game.ended) ?? endedAt != null;
    const lifecycleStatus = ended ? "completed" : started ? "in_progress" : "not_started";
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
    const insights = [...perEventTotals.entries()]
      .map(([eventType, value]) => ({ label: eventLabel(eventType), value }))
      .sort((a, b) => b.value - a.value);
    const claims = perEventTotals.get("admin_confirm_kill_claim") ?? perEventTotals.get("kill_claim") ?? null;
    const disputes = perEventTotals.get("admin_deny_kill_claim") ?? perEventTotals.get("kill_claim_denied") ?? null;
    if (claims != null) insights.unshift({ label: "Claims", value: claims });
    if (disputes != null) insights.unshift({ label: "Disputes", value: disputes });

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
          totalPlayers: playerAnalyticsDocs.length,
          activePlayers: playerAnalyticsDocs.length,
          totalSessions: playerAnalyticsDocs.length > 0 ? 1 : 0,
        },
        insights,
        playerPerformance,
        sessionSummary: {
          totalSessions: playerAnalyticsDocs.length > 0 ? 1 : 0,
          avgSessionLengthSeconds: null,
          longestSessionSeconds: null,
          lastSessionAt: endedAt ?? startedAt,
        },
        eventTotals: Object.fromEntries(perEventTotals.entries()),
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
