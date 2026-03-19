import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";

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
};

type PlayerAnalyticsDoc = {
  playerId?: unknown;
  userId?: unknown;
  displayName?: unknown;
  eventsTotal?: unknown;
  eventCounts?: unknown;
  kills?: unknown;
  deaths?: unknown;
  deathCount?: unknown;
  claimCount?: unknown;
  confirmedCount?: unknown;
  convertedClaimCount?: unknown;
  convertedCount?: unknown;
  accuracyPct?: unknown;
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

export async function GET(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const { gameCode } = await params;
    const normalizedCode = gameCode.trim();
    const access = await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);
    const gameSnapshot = await adminDb.collection("games").doc(normalizedCode).get();
    const gameData = (gameSnapshot.data() ?? {}) as { orgId?: unknown };
    const orgId = typeof gameData.orgId === "string" ? gameData.orgId.trim() : "";
    const tier: ProductTier = orgId ? await resolveOrganizationTier(orgId) : "basic";
    const branding = orgId ? await resolveOrgBranding(orgId) : null;

    const [playerAnalyticsSnap, analyticsEventsSnap] = await Promise.all([
      adminDb.collection("playerAnalytics").where("gameCode", "==", normalizedCode).get(),
      adminDb.collection("analyticsEvents").where("gameCode", "==", normalizedCode).limit(500).get(),
    ]);
    const hasPlayerAnalytics = !playerAnalyticsSnap.empty;
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
    const perEventTotals = new Map<string, number>();
    const playerPerformance = playerAnalyticsSnap.docs.map((doc) => {
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
        eventCounts.kill_claim
      );
      const claimCount = pickFirstNumber(
        data.claimCount,
        eventCounts.kill_claim,
        eventCounts.admin_confirm_kill_claim
      );
      const kills = pickFirstNumber(data.kills, confirmedCount);
      const deaths = pickFirstNumber(data.deaths, data.deathCount, eventCounts.death);
      const sessionCount = asNumber(data.sessionCount);
      const accuracyPct =
        confirmedCount != null && claimCount != null && claimCount > 0 ? (confirmedCount / claimCount) * 100 : null;
      const kdRatio = kills != null ? (deaths != null && deaths > 0 ? kills / deaths : kills) : null;
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

    const totalEventsFromPlayers = playerAnalyticsSnap.docs.reduce((sum, doc) => {
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
    const updatedAt = toIso(
      playerAnalyticsSnap.docs
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
      entitlements: entitlementsForTier(tier),
      ownershipSource: access.ownershipSource,
      branding,
      analytics: {
        overview: {
          gameCode: normalizedCode,
          gameName: asString(game.name) ?? normalizedCode,
          status: lifecycleStatus,
          mode: asString(game.mode),
          startedAt,
          endedAt,
          totalPlayers: playerAnalyticsSnap.size,
          activePlayers: playerAnalyticsSnap.size,
          totalSessions: playerAnalyticsSnap.size > 0 ? 1 : 0,
        },
        insights,
        playerPerformance,
        sessionSummary: {
          totalSessions: playerAnalyticsSnap.size > 0 ? 1 : 0,
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
