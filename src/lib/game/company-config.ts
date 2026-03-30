import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { normalizeProductTier, type ProductTier } from "@/lib/product/entitlements";
import { parseCanonicalGameMode } from "@/lib/game/mode";
import type {
  FirestoreDateValue,
  OrgBranding,
  OrgDoc,
  OrgGameLinkDoc,
  OrgManagerMembershipDoc,
  OrgTemplateDoc,
  OrgTemplateManagerDefaults,
} from "@/lib/types/organization";

export type CompanyTemplateConfig = {
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
};

type OrgLookupDoc = {
  name?: unknown;
  ownerAccountId?: unknown;
  tier?: unknown;
  branding?: unknown;
};

type TemplateLookupDoc = {
  orgId?: unknown;
  name?: unknown;
  config?: unknown;
  metricsEnabled?: unknown;
  managerDefaults?: unknown;
  createdAt?: unknown;
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

function asFirestoreDateValue(value: unknown): FirestoreDateValue {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value;
  if (value instanceof FieldValue) return value;
  return null;
}

function normalizeTemplateManagerDefaults(value: unknown): OrgTemplateManagerDefaults {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    minSecondsBeforeClaim: asNumber(raw.minSecondsBeforeClaim) ?? 0,
    minSecondsBetweenClaims: asNumber(raw.minSecondsBetweenClaims) ?? 0,
    maxActiveClaimsPerPlayer: asNumber(raw.maxActiveClaimsPerPlayer) ?? 1,
    freeRefreshCooldownSeconds: asNumber(raw.freeRefreshCooldownSeconds) ?? 0,
  };
}

function normalizeOrgName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(normalized) ? normalized : null;
}

function normalizeBranding(input: {
  companyName: string;
  companyLogoUrl?: string | null;
  brandAccentColor?: string | null;
  brandThemeLabel?: string | null;
}): OrgBranding {
  const companyName = input.companyName.trim();
  const companyLogoUrl = asNonEmptyString(input.companyLogoUrl) ?? null;
  const brandThemeLabel = asNonEmptyString(input.brandThemeLabel) ?? null;
  const brandAccentColor = normalizeHexColor(input.brandAccentColor) ?? null;
  return {
    companyName,
    companyLogoUrl,
    brandAccentColor,
    brandThemeLabel,
  };
}

export async function createOrganization(input: {
  name: string;
  ownerAccountId: string;
  plan: string;
  tier?: ProductTier;
  branding?: {
    companyName?: string;
    companyLogoUrl?: string | null;
    brandAccentColor?: string | null;
    brandThemeLabel?: string | null;
  };
}): Promise<{ orgId: string }> {
  const orgRef = adminDb.collection("orgs").doc();
  const legacyOrgRef = adminDb.collection("organizations").doc(orgRef.id);

  const normalizedPlan = input.plan === "b2b" ? "b2b" : "b2b";

  const orgDoc: OrgDoc = {
    name: input.name,
    nameLower: normalizeOrgName(input.name),
    ownerAccountId: input.ownerAccountId,
    tier: input.tier ?? "enterprise",
    plan: normalizedPlan,
    branding: normalizeBranding({
      companyName: input.branding?.companyName ?? input.name,
      companyLogoUrl: input.branding?.companyLogoUrl,
      brandAccentColor: input.branding?.brandAccentColor,
      brandThemeLabel: input.branding?.brandThemeLabel,
    }),
    createdAt: FieldValue.serverTimestamp(),
  };

  const ownerMembership: OrgManagerMembershipDoc = {
    uid: input.ownerAccountId,
    role: "owner",
    status: "active",
    isOwner: true,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  batch.set(orgRef, orgDoc);
  batch.set(legacyOrgRef, orgDoc);
  batch.set(orgRef.collection("managers").doc(input.ownerAccountId), ownerMembership);
  batch.set(legacyOrgRef.collection("managers").doc(input.ownerAccountId), ownerMembership);
  await batch.commit();

  return { orgId: orgRef.id };
}

export async function updateOrganizationBranding(input: {
  orgId: string;
  companyName?: string;
  companyLogoUrl?: string | null;
  brandAccentColor?: string | null;
  brandThemeLabel?: string | null;
}): Promise<void> {
  const companyName = asNonEmptyString(input.companyName);
  if (!companyName && !input.companyLogoUrl && !input.brandAccentColor && !input.brandThemeLabel) {
    return;
  }

  const branding: OrgBranding = normalizeBranding({
    companyName: companyName ?? "",
    companyLogoUrl: input.companyLogoUrl,
    brandAccentColor: input.brandAccentColor,
    brandThemeLabel: input.brandThemeLabel,
  });

  if (!branding.companyName) {
    const orgDocs = await Promise.all([
      adminDb.collection("orgs").doc(input.orgId).get(),
      adminDb.collection("organizations").doc(input.orgId).get(),
    ]);
    const fallbackName =
      asNonEmptyString((orgDocs[0].data() as OrgLookupDoc | undefined)?.name) ??
      asNonEmptyString((orgDocs[1].data() as OrgLookupDoc | undefined)?.name) ??
      "";
    branding.companyName = fallbackName;
  }

  const updatePayload: Partial<OrgDoc> = {
    branding,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (companyName) {
    updatePayload.name = companyName;
    updatePayload.nameLower = normalizeOrgName(companyName);
  }

  const batch = adminDb.batch();
  batch.set(adminDb.collection("orgs").doc(input.orgId), updatePayload, { merge: true });
  batch.set(adminDb.collection("organizations").doc(input.orgId), updatePayload, { merge: true });
  await batch.commit();
}

export async function createGameTemplate(input: {
  orgId: string;
  name: string;
  config: CompanyTemplateConfig;
  metricsEnabled: string[];
  managerDefaults?: OrgTemplateManagerDefaults;
  createdByAccountId?: string;
}): Promise<{ templateId: string }> {
  const templateRef = adminDb.collection("gameTemplates").doc();
  const managerDefaults = input.managerDefaults ?? {
    minSecondsBeforeClaim: 0,
    minSecondsBetweenClaims: 0,
    maxActiveClaimsPerPlayer: 1,
    freeRefreshCooldownSeconds: 0,
  };

  const templateDoc: OrgTemplateDoc = {
    orgId: input.orgId,
    name: input.name,
    config: input.config,
    metricsEnabled: input.metricsEnabled,
    managerDefaults,
    createdByAccountId: input.createdByAccountId ?? "unknown",
    createdAt: FieldValue.serverTimestamp(),
  };

  const canonicalTemplateRef = adminDb.collection("orgs").doc(input.orgId).collection("templates").doc(templateRef.id);
  const legacyTemplateRef = adminDb.collection("organizations").doc(input.orgId).collection("templates").doc(templateRef.id);

  const batch = adminDb.batch();
  batch.set(templateRef, templateDoc);
  batch.set(canonicalTemplateRef, templateDoc);
  batch.set(legacyTemplateRef, templateDoc);
  await batch.commit();
  return { templateId: templateRef.id };
}

export async function linkGameToOrganization(input: {
  orgId: string;
  gameCode: string;
  createdByAccountId: string;
  templateId?: string | null;
}): Promise<void> {
  const gameLink: OrgGameLinkDoc = {
    orgId: input.orgId,
    gameCode: input.gameCode,
    createdByAccountId: input.createdByAccountId,
    templateId: input.templateId ?? null,
    createdAt: FieldValue.serverTimestamp(),
  };

  const orgGameRef = adminDb.collection("orgs").doc(input.orgId).collection("games").doc(input.gameCode);
  const legacyOrgGameRef = adminDb
    .collection("organizations")
    .doc(input.orgId)
    .collection("games")
    .doc(input.gameCode);

  const batch = adminDb.batch();
  batch.set(orgGameRef, gameLink);
  batch.set(legacyOrgGameRef, gameLink);
  await batch.commit();
}

export async function findOrganizationByOwnerAndName(input: {
  ownerAccountId: string;
  name: string;
}): Promise<{ orgId: string; name: string } | null> {
  const normalizedName = normalizeOrgName(input.name);
  if (!normalizedName) return null;

  const canonical = await adminDb
    .collection("orgs")
    .where("ownerAccountId", "==", input.ownerAccountId)
    .get();

  for (const doc of canonical.docs) {
    const data = (doc.data() ?? {}) as OrgLookupDoc & { nameLower?: unknown };
    const nameLower = asNonEmptyString(data.nameLower) ?? normalizeOrgName(asNonEmptyString(data.name) ?? "");
    if (nameLower === normalizedName) {
      return { orgId: doc.id, name: asNonEmptyString(data.name) ?? input.name };
    }
  }

  const legacy = await adminDb
    .collection("organizations")
    .where("ownerAccountId", "==", input.ownerAccountId)
    .get();

  for (const doc of legacy.docs) {
    const data = (doc.data() ?? {}) as OrgLookupDoc & { nameLower?: unknown };
    const nameLower = asNonEmptyString(data.nameLower) ?? normalizeOrgName(asNonEmptyString(data.name) ?? "");
    if (nameLower === normalizedName) {
      return { orgId: doc.id, name: asNonEmptyString(data.name) ?? input.name };
    }
  }

  return null;
}

export async function assertOrganizationOwner(input: {
  orgId: string;
  ownerAccountId: string;
}): Promise<{ tier: ProductTier }> {
  const canonicalOrg = await adminDb.collection("orgs").doc(input.orgId).get();
  if (canonicalOrg.exists) {
    const data = (canonicalOrg.data() ?? {}) as OrgLookupDoc;
    const owner = asNonEmptyString(data.ownerAccountId);
    if (owner === input.ownerAccountId) {
      return { tier: normalizeProductTier(data.tier) };
    }
  }

  const legacyOrg = await adminDb.collection("organizations").doc(input.orgId).get();
  if (legacyOrg.exists) {
    const data = (legacyOrg.data() ?? {}) as OrgLookupDoc;
    const owner = asNonEmptyString(data.ownerAccountId);
    if (owner === input.ownerAccountId) {
      return { tier: normalizeProductTier(data.tier) };
    }
  }

  throw new Error("Forbidden organization access.");
}

export async function listOrganizationTemplates(input: { orgId: string }): Promise<Array<{ templateId: string; template: OrgTemplateDoc }>> {
  const canonicalTemplatesSnap = await adminDb.collection("orgs").doc(input.orgId).collection("templates").get();
  const legacyTemplatesSnap = await adminDb.collection("organizations").doc(input.orgId).collection("templates").get();
  const globalTemplatesSnap = await adminDb.collection("gameTemplates").where("orgId", "==", input.orgId).get();

  const templateMap = new Map<string, OrgTemplateDoc>();

  const applyTemplate = (id: string, data: TemplateLookupDoc) => {
    const name = asNonEmptyString(data.name);
    const rawConfig = data.config && typeof data.config === "object" ? (data.config as Record<string, unknown>) : {};
    if (!name) return;

    const config: CompanyTemplateConfig = {
      mode: parseCanonicalGameMode(rawConfig.mode) ?? "classic",
      durationMinutes: asNumber(rawConfig.durationMinutes) ?? 30,
      wordDifficulty: asNonEmptyString(rawConfig.wordDifficulty) ?? "medium",
      teamsEnabled: Boolean(rawConfig.teamsEnabled),
    };
    const metricsEnabled = Array.isArray(data.metricsEnabled)
      ? data.metricsEnabled.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
      : [];

    const template: OrgTemplateDoc = {
      orgId: asNonEmptyString(data.orgId) ?? input.orgId,
      name,
      config,
      metricsEnabled,
      managerDefaults: normalizeTemplateManagerDefaults(data.managerDefaults),
      createdByAccountId: "unknown",
      createdAt: asFirestoreDateValue(data.createdAt),
    };

    if (!templateMap.has(id)) {
      templateMap.set(id, template);
    }
  };

  for (const doc of canonicalTemplatesSnap.docs) {
    applyTemplate(doc.id, (doc.data() ?? {}) as TemplateLookupDoc);
  }
  for (const doc of legacyTemplatesSnap.docs) {
    applyTemplate(doc.id, (doc.data() ?? {}) as TemplateLookupDoc);
  }
  for (const doc of globalTemplatesSnap.docs) {
    applyTemplate(doc.id, (doc.data() ?? {}) as TemplateLookupDoc);
  }

  return [...templateMap.entries()].map(([templateId, template]) => ({ templateId, template }));
}

export async function findOrganizationTemplateById(input: {
  orgId: string;
  templateId: string;
}): Promise<{ templateId: string; template: OrgTemplateDoc } | null> {
  const templates = await listOrganizationTemplates({ orgId: input.orgId });
  return templates.find((entry) => entry.templateId === input.templateId) ?? null;
}
