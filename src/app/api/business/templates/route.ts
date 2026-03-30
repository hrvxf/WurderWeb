import { NextResponse } from "next/server";

import {
  assertOrganizationOwner,
  createGameTemplate,
  createOrganization,
  findOrganizationByOwnerAndName,
  listOrganizationTemplates,
} from "@/lib/game/company-config";
import { entitlementsForTier, hasFeature } from "@/lib/product/entitlements";
import { isCanonicalGameMode, parseCanonicalGameMode } from "@/lib/game/mode";
import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";

export const runtime = "nodejs";

type TemplateBody = {
  orgId?: string;
  orgName?: string;
  templateName?: string;
  mode?: string;
  durationMinutes?: number;
  wordDifficulty?: string;
  teamsEnabled?: boolean;
  metricsEnabled?: string[];
  minSecondsBeforeClaim?: number;
  minSecondsBetweenClaims?: number;
  maxActiveClaimsPerPlayer?: number;
  freeRefreshCooldownSeconds?: number;
};

function toInt(value: unknown, fallback: number, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) return fallback;
  return parsed;
}

function parseOrgName(searchParam: string | null): string {
  return typeof searchParam === "string" ? searchParam.trim() : "";
}

export async function GET(request: Request) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const { searchParams } = new URL(request.url);

    const orgId = (searchParams.get("orgId") ?? "").trim();
    const orgName = parseOrgName(searchParams.get("orgName"));

    let resolvedOrgId = orgId;
    let resolvedOrgName: string | null = null;

    if (!resolvedOrgId && orgName) {
      const found = await findOrganizationByOwnerAndName({ ownerAccountId: uid, name: orgName });
      if (found) {
        resolvedOrgId = found.orgId;
        resolvedOrgName = found.name;
      }
    }

    if (!resolvedOrgId) {
      return NextResponse.json({ orgId: null, orgName: orgName || null, templates: [] });
    }

    const access = await assertOrganizationOwner({ orgId: resolvedOrgId, ownerAccountId: uid });
    if (!hasFeature(access.tier, "templateReuse")) {
      return NextResponse.json(
        {
          code: "FEATURE_LOCKED",
          message: "Template reuse is available on Enterprise tier.",
          tier: access.tier,
          entitlements: entitlementsForTier(access.tier),
          orgId: resolvedOrgId,
          orgName: resolvedOrgName ?? (orgName || null),
          templates: [],
        },
        { status: 403 }
      );
    }
    const templates = await listOrganizationTemplates({ orgId: resolvedOrgId });

    return NextResponse.json({
      orgId: resolvedOrgId,
      orgName: resolvedOrgName ?? (orgName || null),
      tier: access.tier,
      entitlements: entitlementsForTier(access.tier),
      templates: templates.map((entry) => ({
        templateId: entry.templateId,
        name: entry.template.name,
        config: entry.template.config,
        metricsEnabled: entry.template.metricsEnabled,
        managerDefaults: entry.template.managerDefaults,
      })),
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before managing templates." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }
    if (error instanceof Error && error.message.includes("Forbidden organization access")) {
      return NextResponse.json({ code: "FORBIDDEN", message: "You cannot access templates for this organization." }, { status: 403 });
    }

    console.error("[business:templates:get] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load templates." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const body = (await request.json().catch(() => ({}))) as TemplateBody;

    const orgName = typeof body.orgName === "string" ? body.orgName.trim() : "";
    const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
    const modeInput = typeof body.mode === "string" ? body.mode.trim() : "";
    const mode = parseCanonicalGameMode(modeInput);
    const wordDifficulty = typeof body.wordDifficulty === "string" ? body.wordDifficulty.trim() : "";
    const durationMinutes = Number(body.durationMinutes);
    const teamsEnabled = Boolean(body.teamsEnabled);
    const metricsEnabled = Array.isArray(body.metricsEnabled)
      ? body.metricsEnabled.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
      : [];

    if (!orgName || !templateName || !mode || !wordDifficulty || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return NextResponse.json({ code: "INVALID_REQUEST", message: "Missing or invalid template fields." }, { status: 400 });
    }

    if (!isCanonicalGameMode(mode)) {
      return NextResponse.json({ code: "INVALID_REQUEST", message: "Invalid mode. Allowed values: classic, elimination, elimination_multi, guilds." }, { status: 400 });
    }

    const requestedOrgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
    const foundOrg = requestedOrgId
      ? { orgId: requestedOrgId, name: orgName }
      : await findOrganizationByOwnerAndName({ ownerAccountId: uid, name: orgName });
    const orgId =
      foundOrg?.orgId ??
      (
        await createOrganization({
          name: orgName,
          ownerAccountId: uid,
          plan: "b2b",
        })
      ).orgId;

    const access = await assertOrganizationOwner({ orgId, ownerAccountId: uid });
    if (!hasFeature(access.tier, "templateReuse")) {
      return NextResponse.json(
        {
          code: "FEATURE_LOCKED",
          message: "Template reuse is available on Enterprise tier.",
          tier: access.tier,
          entitlements: entitlementsForTier(access.tier),
        },
        { status: 403 }
      );
    }

    const { templateId } = await createGameTemplate({
      orgId,
      name: templateName,
      config: {
        mode,
        durationMinutes,
        wordDifficulty,
        teamsEnabled,
      },
      metricsEnabled,
      managerDefaults: {
        minSecondsBeforeClaim: toInt(body.minSecondsBeforeClaim, 0, 0),
        minSecondsBetweenClaims: toInt(body.minSecondsBetweenClaims, 0, 0),
        maxActiveClaimsPerPlayer: toInt(body.maxActiveClaimsPerPlayer, 1, 1),
        freeRefreshCooldownSeconds: toInt(body.freeRefreshCooldownSeconds, 0, 0),
      },
      createdByAccountId: uid,
    });

    return NextResponse.json(
      {
        orgId,
        templateId,
        tier: access.tier,
        entitlements: entitlementsForTier(access.tier),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before managing templates." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }
    if (error instanceof Error && error.message.includes("Forbidden organization access")) {
      return NextResponse.json({ code: "FORBIDDEN", message: "You cannot save templates for this organization." }, { status: 403 });
    }

    console.error("[business:templates:post] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to save template." }, { status: 500 });
  }
}

