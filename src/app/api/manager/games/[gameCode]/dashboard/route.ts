import { NextResponse } from "next/server";

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

export async function GET(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const { gameCode } = await params;
    const normalizedCode = gameCode.trim();
    const access = await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);
    const gameDoc = await adminDb.collection("games").doc(normalizedCode).get();
    const gameData = (gameDoc.data() ?? {}) as { orgId?: unknown };
    const orgId = typeof gameData.orgId === "string" ? gameData.orgId.trim() : "";
    const tier: ProductTier = orgId ? await resolveOrganizationTier(orgId) : "basic";
    const branding = orgId ? await resolveOrgBranding(orgId) : null;

    const analyticsDoc = await adminDb.collection("gameAnalytics").doc(normalizedCode).get();
    if (!analyticsDoc.exists) {
      return NextResponse.json(
        {
          code: "ANALYTICS_NOT_FOUND",
          message: "Aggregated analytics were not found for this game.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gameCode: normalizedCode,
      tier,
      entitlements: entitlementsForTier(tier),
      ownershipSource: access.ownershipSource,
      branding,
      analytics: analyticsDoc.data() ?? {},
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
          message: "This account is not authorized to manage this game.",
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
