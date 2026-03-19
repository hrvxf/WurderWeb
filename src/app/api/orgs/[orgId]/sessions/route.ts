import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
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
  createdAt?: unknown;
};

type AnalyticsOverview = {
  status?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  totalPlayers?: unknown;
};

type PlayerAnalyticsDoc = {
  eventsTotal?: unknown;
  eventCounts?: unknown;
};

type SessionAggregate = {
  gameCode: string;
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
  if (explicit) return explicit;

  const ended = Boolean(game.ended);
  const started = Boolean(game.started);

  if (ended) return "ended";
  if (started) return "active";
  return "not_started";
}

function sumEventCounts(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  return Object.values(value as Record<string, unknown>).reduce<number>((sum, entry) => sum + (asNumber(entry) ?? 0), 0);
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

    const linkMap = new Map<string, { createdAt: string | null }>();

    const collectLinks = (docs: Array<{ id: string; data: () => OrgGameLinkDoc }>) => {
      for (const doc of docs) {
        const data = (doc.data() ?? {}) as OrgGameLinkDoc;
        const gameCode = asNonEmptyString(data.gameCode) ?? asNonEmptyString(doc.id);
        if (!gameCode) continue;

        const createdAt = timestampToIso(data.createdAt);
        const existing = linkMap.get(gameCode);
        if (!existing || (!existing.createdAt && createdAt)) {
          linkMap.set(gameCode, { createdAt });
        }
      }
    };

    collectLinks(canonicalOrgGamesSnap.docs);
    collectLinks(legacyOrgGamesSnap.docs);

    if (linkMap.size === 0) {
      const fallbackGames = await adminDb.collection("games").where("orgId", "==", access.orgId).limit(100).get();
      for (const gameDoc of fallbackGames.docs) {
        if (!linkMap.has(gameDoc.id)) {
          linkMap.set(gameDoc.id, { createdAt: timestampToIso((gameDoc.data() ?? {}).createdAt) });
        }
      }
    }

    const gameCodes = [...linkMap.keys()];

    const orgUserAnalyticsSnap = await adminDb.collection("orgAnalytics").doc(access.orgId).collection("users").get();
    const orgUserMetrics = orgUserAnalyticsSnap.docs.map((doc) => (doc.data() ?? {}) as Record<string, unknown>);
    const orgSuccessRates = orgUserMetrics
      .map((row) => asNumber(row.successRate) ?? asNumber(row.averageSuccessRate))
      .filter((value): value is number => value != null && Number.isFinite(value));
    const orgDisputeRates = orgUserMetrics
      .map((row) => asNumber(row.disputeRate) ?? asNumber(row.averageDisputeRate))
      .filter((value): value is number => value != null && Number.isFinite(value));
    const orgResolutionTimes = orgUserMetrics
      .map((row) => asNumber(row.avgResolutionTimeMs) ?? asNumber(row.averageResolutionTimeMs))
      .filter((value): value is number => value != null && Number.isFinite(value));

    const sessions = await Promise.all(
      gameCodes.map(async (gameCode) => {
        const [gameDoc, playerAnalyticsSnap] = await Promise.all([
          adminDb.collection("games").doc(gameCode).get(),
          adminDb.collection("playerAnalytics").where("gameCode", "==", gameCode).get(),
        ]);

        const game = (gameDoc.data() ?? {}) as GameDoc;
        const claims = playerAnalyticsSnap.docs.reduce((sum, doc) => {
          const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
          const eventCounts =
            data.eventCounts && typeof data.eventCounts === "object" ? (data.eventCounts as Record<string, unknown>) : {};
          return sum + (asNumber(eventCounts.admin_confirm_kill_claim) ?? asNumber(eventCounts.kill_claim) ?? 0);
        }, 0);
        const disputes = playerAnalyticsSnap.docs.reduce((sum, doc) => {
          const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
          const eventCounts =
            data.eventCounts && typeof data.eventCounts === "object" ? (data.eventCounts as Record<string, unknown>) : {};
          return sum + (asNumber(eventCounts.admin_deny_kill_claim) ?? asNumber(eventCounts.kill_claim_denied) ?? 0);
        }, 0);
        const totalEvents = playerAnalyticsSnap.docs.reduce((sum, doc) => {
          const data = (doc.data() ?? {}) as PlayerAnalyticsDoc;
          return sum + (asNumber(data.eventsTotal) ?? sumEventCounts(data.eventCounts));
        }, 0);
        const successRate = claims > 0 ? ((claims - disputes) / claims) * 100 : null;
        const disputeRate = claims > 0 ? (disputes / claims) * 100 : null;
        const avgResolutionTimeMs = null;

        const session: SessionAggregate = {
          gameCode,
          status: deriveStatus(game, {}),
          createdAt: linkMap.get(gameCode)?.createdAt ?? timestampToIso(game.createdAt),
          startedAt: timestampToIso(game.started),
          endedAt: timestampToIso(game.ended),
          playerCount: playerAnalyticsSnap.size,
          claims: claims > 0 ? claims : totalEvents > 0 ? 0 : null,
          disputes: disputes > 0 ? disputes : claims > 0 ? 0 : null,
          successRate,
          disputeRate,
          avgResolutionTimeMs,
        };

        return session;
      })
    );

    sessions.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const average = (values: number[]) => (values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
    const successRates = sessions
      .map((session) => session.successRate)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const disputeRates = sessions
      .map((session) => session.disputeRate)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const resolutionTimes = sessions
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
        totalSessions: sessions.length,
        averageSuccessRate: orgSuccessRates.length > 0 ? average(orgSuccessRates) : average(successRates),
        averageDisputeRate: orgDisputeRates.length > 0 ? average(orgDisputeRates) : average(disputeRates),
        averageResolutionTimeMs: orgResolutionTimes.length > 0 ? average(orgResolutionTimes) : average(resolutionTimes),
      },
      trends: sessions.slice(0, 12).map((session, index) => ({
        index: index + 1,
        gameCode: session.gameCode,
        createdAt: session.createdAt,
        successRate: session.successRate,
        disputeRate: session.disputeRate,
        avgResolutionTimeMs: session.avgResolutionTimeMs,
      })),
      sessions,
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
