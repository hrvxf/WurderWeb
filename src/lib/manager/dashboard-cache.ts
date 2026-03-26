import { FieldPath } from "firebase-admin/firestore";

import { buildManagerDashboardPayload } from "@/domain/manager-dashboard/payload";
import type { ManagerDashboardPayload } from "@/domain/manager-dashboard/types";
import { asBoolean, asNumber, asString } from "@/domain/manager-dashboard/metrics";
import { adminDb } from "@/lib/firebase/admin";
import { enrichPlayerAnalyticsWithAvatars } from "@/lib/manager/player-avatar-enrichment";

type GameDoc = {
  orgId?: unknown;
  name?: unknown;
  mode?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  started?: unknown;
  ended?: unknown;
  analyticsVisibility?: unknown;
  analyticsAccess?: unknown;
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
  managerDashboardConfig?: unknown;
};

type ManagerDashboardConfig = {
  kpiThresholds?: unknown;
};

type KpiThresholdsDoc = {
  disputeRateWarningRatio?: unknown;
  disputeRateLabel?: unknown;
};

type ManagerDashboardCacheDoc = {
  gameCode?: unknown;
  orgId?: unknown;
  analytics?: unknown;
  generatedAt?: unknown;
  sourceUpdatedAt?: unknown;
  schemaVersion?: unknown;
  buildReason?: unknown;
};

export type ManagerDashboardKpiThresholds = {
  disputeRateWarningRatio: number;
  disputeRateLabel: string | null;
};

export type AnalyticsVisibility = "limited_live" | "full_post_session";

export type AnalyticsAccess = {
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

function toUpperTrimmed(value: string): string {
  return value.trim().toUpperCase();
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

function parseIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const asTimestamp = value as { toDate: () => Date };
    const date = asTimestamp.toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export function normalizeBrandingFromOrg(data: OrgDoc): {
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
} {
  const branding = (data.branding && typeof data.branding === "object" ? data.branding : {}) as OrgBranding;
  return {
    companyName: asNonEmptyString(branding.companyName) ?? asNonEmptyString(data.name),
    companyLogoUrl: asNonEmptyString(branding.companyLogoUrl),
    brandAccentColor: asNonEmptyString(branding.brandAccentColor),
    brandThemeLabel: asNonEmptyString(branding.brandThemeLabel),
  };
}

export async function resolveOrgBranding(orgId: string): Promise<{
  companyName: string | null;
  companyLogoUrl: string | null;
  brandAccentColor: string | null;
  brandThemeLabel: string | null;
}> {
  const canonical = await adminDb.collection("orgs").doc(orgId).get();
  if (canonical.exists) return normalizeBrandingFromOrg((canonical.data() ?? {}) as OrgDoc);
  const legacy = await adminDb.collection("organizations").doc(orgId).get();
  if (legacy.exists) return normalizeBrandingFromOrg((legacy.data() ?? {}) as OrgDoc);
  return {
    companyName: null,
    companyLogoUrl: null,
    brandAccentColor: null,
    brandThemeLabel: null,
  };
}

export async function resolveOrgKpiThresholds(orgId: string): Promise<ManagerDashboardKpiThresholds> {
  const defaults: ManagerDashboardKpiThresholds = {
    disputeRateWarningRatio: 0.3,
    disputeRateLabel: "expected threshold",
  };

  const [canonical, legacy] = await Promise.all([
    adminDb.collection("orgs").doc(orgId).get(),
    adminDb.collection("organizations").doc(orgId).get(),
  ]);
  const orgData = (canonical.data() ?? legacy.data() ?? {}) as OrgDoc;
  const managerConfig =
    orgData.managerDashboardConfig && typeof orgData.managerDashboardConfig === "object"
      ? (orgData.managerDashboardConfig as ManagerDashboardConfig)
      : {};
  const kpiThresholds = (managerConfig.kpiThresholds && typeof managerConfig.kpiThresholds === "object"
    ? managerConfig.kpiThresholds
    : {}) as KpiThresholdsDoc;
  const rawRatio = asNumber(kpiThresholds.disputeRateWarningRatio);
  const ratio = rawRatio != null && rawRatio >= 0 && rawRatio <= 1 ? rawRatio : defaults.disputeRateWarningRatio;
  return {
    disputeRateWarningRatio: ratio,
    disputeRateLabel: asNonEmptyString(kpiThresholds.disputeRateLabel) ?? defaults.disputeRateLabel,
  };
}

export async function queryPlayerAnalyticsByCode(normalizedCode: string) {
  const exactSnapshots = await Promise.all([
    adminDb.collection("playerAnalytics").where("gameCode", "==", normalizedCode).get(),
    adminDb.collection("playerAnalytics").where("gameId", "==", normalizedCode).get(),
  ]);

  const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const snap of exactSnapshots) {
    for (const doc of snap.docs) byId.set(doc.id, doc);
  }

  let usedFallback = false;
  if (byId.size === 0) {
    usedFallback = true;
    const fallbackSnapshots = await Promise.all([
      adminDb.collection("playerAnalytics").orderBy(FieldPath.documentId()).startAt(`${normalizedCode}_`).endAt(`${normalizedCode}_\uf8ff`).get(),
      adminDb.collection("playerAnalytics").orderBy(FieldPath.documentId()).startAt(`${normalizedCode}:`).endAt(`${normalizedCode}:\uf8ff`).get(),
      adminDb.collection("playerAnalytics").orderBy(FieldPath.documentId()).startAt(`${normalizedCode}-`).endAt(`${normalizedCode}-\uf8ff`).get(),
    ]);
    for (const snap of fallbackSnapshots) {
      for (const doc of snap.docs) byId.set(doc.id, doc);
    }
  }

  return {
    docs: [...byId.values()].map((doc) => ({ id: doc.id, data: (doc.data() ?? {}) as Record<string, unknown> })),
    usedFallback,
  };
}

export async function loadManagerDashboardCache(gameCode: string): Promise<{
  analytics: ManagerDashboardPayload;
  generatedAt: string | null;
  sourceUpdatedAt: string | null;
  orgId: string | null;
  buildReason: string | null;
} | null> {
  const normalizedCode = toUpperTrimmed(gameCode);
  const snap = await adminDb.collection("managerDashboard").doc(normalizedCode).get();
  if (!snap.exists) return null;
  const data = (snap.data() ?? {}) as ManagerDashboardCacheDoc;
  const analytics = data.analytics;
  if (!analytics || typeof analytics !== "object") return null;
  const parsed = analytics as ManagerDashboardPayload;
  if (parsed.schemaVersion !== "manager_dashboard.v1") return null;

  return {
    analytics: parsed,
    generatedAt: parseIso(data.generatedAt),
    sourceUpdatedAt: parseIso(data.sourceUpdatedAt),
    orgId: asNonEmptyString(data.orgId),
    buildReason: asNonEmptyString(data.buildReason),
  };
}

export async function persistManagerDashboardCache(input: {
  gameCode: string;
  orgId: string | null;
  analytics: ManagerDashboardPayload;
  buildReason: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await adminDb.collection("managerDashboard").doc(input.gameCode).set(
    {
      gameCode: input.gameCode,
      orgId: input.orgId,
      analytics: input.analytics,
      sourceUpdatedAt: input.analytics.updatedAt ?? null,
      generatedAt: nowIso,
      schemaVersion: input.analytics.schemaVersion,
      buildReason: input.buildReason,
    },
    { merge: true }
  );
}

export async function buildAndCacheManagerDashboard(input: {
  gameCode: string;
  includeTimeline: boolean;
  game?: GameDoc | null;
  analyticsEventLimit?: number;
  buildReason: string;
}): Promise<{
  game: GameDoc;
  orgId: string | null;
  analytics: ManagerDashboardPayload;
  playerRows: number;
  eventRows: number;
  usedFallback: boolean;
}> {
  const normalizedCode = toUpperTrimmed(input.gameCode);
  const gameSnapshot = input.game ? null : await adminDb.collection("games").doc(normalizedCode).get();
  const game = (input.game ?? (gameSnapshot?.data() ?? {})) as GameDoc;
  const orgId = asNonEmptyString(game.orgId);
  const thresholds = orgId ? await resolveOrgKpiThresholds(orgId) : undefined;

  const playerQueryResult = await queryPlayerAnalyticsByCode(normalizedCode);
  const playerAnalyticsDocs = await enrichPlayerAnalyticsWithAvatars(playerQueryResult.docs);
  const analyticsEventsSnap = await adminDb
    .collection("analyticsEvents")
    .where("gameCode", "==", normalizedCode)
    .limit(input.analyticsEventLimit ?? 200)
    .get();

  const analytics = buildManagerDashboardPayload({
    gameCode: normalizedCode,
    game,
    playerAnalyticsDocs,
    analyticsEvents: analyticsEventsSnap.docs.map((doc) => ({ id: doc.id, data: (doc.data() ?? {}) as Record<string, unknown> })),
    includeTimeline: input.includeTimeline,
    thresholds,
  });

  await persistManagerDashboardCache({
    gameCode: normalizedCode,
    orgId,
    analytics,
    buildReason: input.buildReason,
  });

  return {
    game,
    orgId,
    analytics,
    playerRows: playerAnalyticsDocs.length,
    eventRows: analyticsEventsSnap.docs.length,
    usedFallback: playerQueryResult.usedFallback,
  };
}

export function resolveAnalyticsAccess(input: {
  game: GameDoc;
  analytics: ManagerDashboardPayload;
  tierEntitlements: {
    managerInsights: boolean;
    managerSummaries: boolean;
    exports: boolean;
  };
}): AnalyticsAccess {
  const analyticsAccessFromDoc =
    input.game.analyticsAccess && typeof input.game.analyticsAccess === "object"
      ? (input.game.analyticsAccess as Record<string, unknown>)
      : null;
  const explicitVisibility = normalizeVisibility(analyticsAccessFromDoc?.visibility) ?? normalizeVisibility(input.game.analyticsVisibility);
  const visibility: AnalyticsVisibility =
    explicitVisibility ?? (input.analytics.overview.lifecycleStatus === "completed" ? "full_post_session" : "limited_live");
  const fallbackAllowedSections: AnalyticsAccess["allowedSections"] =
    visibility === "full_post_session"
      ? {
          overview: true,
          insights: input.tierEntitlements.managerInsights,
          playerComparison: true,
          sessionSummary: input.tierEntitlements.managerSummaries,
          exports: input.tierEntitlements.exports,
        }
      : {
          overview: true,
          insights: false,
          playerComparison: false,
          sessionSummary: false,
          exports: false,
        };

  return {
    visibility,
    allowedSections: normalizeAllowedSections(analyticsAccessFromDoc?.allowedSections) ?? fallbackAllowedSections,
    message:
      asString(analyticsAccessFromDoc?.message) ??
      (visibility === "limited_live" ? "Full analytics unlock after the session ends." : null),
  };
}
