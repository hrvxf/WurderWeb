import { NextResponse } from "next/server";

import {
  assertOrganizationOwner,
  createGameTemplate,
  createOrganization,
  findOrganizationByOwnerAndName,
  findOrganizationTemplateById,
  linkGameToOrganization,
  updateOrganizationBranding,
} from "@/lib/game/company-config";
import { hasFeature } from "@/lib/product/entitlements";
import {
  CreateGameAuthInfrastructureError,
  createGameForHostUid,
  GameCodeCollisionError,
  UnauthenticatedCreateGameError,
  verifyFirebaseAuthHeader,
} from "@/lib/game/create-game";

export const runtime = "nodejs";

type CreateCompanyGameBody = {
  orgId?: string;
  orgName: string;
  companyLogoUrl?: string;
  brandAccentColor?: string;
  brandThemeLabel?: string;
  templateId?: string;
  templateName: string;
  saveTemplate?: boolean;
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
  metricsEnabled?: string[];
  minSecondsBeforeClaim: number;
  minSecondsBetweenClaims: number;
  maxActiveClaimsPerPlayer: number;
  freeRefreshCooldownSeconds: number;
};

function toValidIntegerField(value: unknown, fieldName: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`Missing or invalid ${fieldName}.`);
  }
  return parsed;
}

function toValidBody(raw: unknown): CreateCompanyGameBody {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const body = raw as Partial<CreateCompanyGameBody>;
  const orgId = typeof body.orgId === "string" ? body.orgId.trim() : "";
  const orgName = typeof body.orgName === "string" ? body.orgName.trim() : "";
  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
  const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
  const companyLogoUrl = typeof body.companyLogoUrl === "string" ? body.companyLogoUrl.trim() : "";
  const brandAccentColor = typeof body.brandAccentColor === "string" ? body.brandAccentColor.trim() : "";
  const brandThemeLabel = typeof body.brandThemeLabel === "string" ? body.brandThemeLabel.trim() : "";
  const saveTemplate = body.saveTemplate !== false;
  const mode = typeof body.mode === "string" ? body.mode.trim() : "";
  const wordDifficulty = typeof body.wordDifficulty === "string" ? body.wordDifficulty.trim() : "";
  const durationMinutes = Number(body.durationMinutes);
  const teamsEnabled = Boolean(body.teamsEnabled);
  const metricsEnabled = Array.isArray(body.metricsEnabled)
    ? body.metricsEnabled.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
    : [];
  const minSecondsBeforeClaim = toValidIntegerField(body.minSecondsBeforeClaim, "minSecondsBeforeClaim", 0);
  const minSecondsBetweenClaims = toValidIntegerField(body.minSecondsBetweenClaims, "minSecondsBetweenClaims", 0);
  const maxActiveClaimsPerPlayer =
    body.maxActiveClaimsPerPlayer == null ? 1 : toValidIntegerField(body.maxActiveClaimsPerPlayer, "maxActiveClaimsPerPlayer", 1);
  const freeRefreshCooldownSeconds = toValidIntegerField(body.freeRefreshCooldownSeconds, "freeRefreshCooldownSeconds", 0);

  if (!orgName || !mode || !wordDifficulty || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Missing or invalid create-company-game fields.");
  }

  if (!templateId && saveTemplate && !templateName) {
    throw new Error("Template name is required when saving a template.");
  }

  if (companyLogoUrl) {
    try {
      const parsedUrl = new URL(companyLogoUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error();
      }
    } catch {
      throw new Error("Invalid companyLogoUrl. Use an http/https URL.");
    }
  }

  if (brandAccentColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(brandAccentColor)) {
    throw new Error("Invalid brandAccentColor. Use #RGB or #RRGGBB.");
  }

  return {
    orgId: orgId || undefined,
    orgName,
    companyLogoUrl: companyLogoUrl || undefined,
    brandAccentColor: brandAccentColor || undefined,
    brandThemeLabel: brandThemeLabel || undefined,
    templateId: templateId || undefined,
    templateName,
    saveTemplate,
    mode,
    durationMinutes,
    wordDifficulty,
    teamsEnabled,
    metricsEnabled,
    minSecondsBeforeClaim,
    minSecondsBetweenClaims,
    maxActiveClaimsPerPlayer,
    freeRefreshCooldownSeconds,
  };
}

export async function POST(request: Request) {
  try {
    const hostUid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const body = toValidBody(await request.json());

    const existingOrg = body.orgId
      ? { orgId: body.orgId, name: body.orgName }
      : await findOrganizationByOwnerAndName({ ownerAccountId: hostUid, name: body.orgName });
    const orgId =
      existingOrg?.orgId ??
      (
        await createOrganization({
          name: body.orgName,
          ownerAccountId: hostUid,
          plan: "b2b",
          branding: {
            companyName: body.orgName,
            companyLogoUrl: body.companyLogoUrl ?? null,
            brandAccentColor: body.brandAccentColor ?? null,
            brandThemeLabel: body.brandThemeLabel ?? null,
          },
        })
      ).orgId;

    if (existingOrg?.orgId) {
      await updateOrganizationBranding({
        orgId,
        companyName: body.orgName,
        companyLogoUrl: body.companyLogoUrl ?? null,
        brandAccentColor: body.brandAccentColor ?? null,
        brandThemeLabel: body.brandThemeLabel ?? null,
      });
    }

    const access = await assertOrganizationOwner({ orgId, ownerAccountId: hostUid });

    let templateId: string | undefined = body.templateId;
    if (templateId || body.saveTemplate) {
      if (!hasFeature(access.tier, "templateReuse")) {
        return NextResponse.json(
          {
            code: "FEATURE_LOCKED",
            message: "Template reuse is available on Enterprise tier.",
            tier: access.tier,
          },
          { status: 403 }
        );
      }
    }

    if (templateId) {
      const template = await findOrganizationTemplateById({ orgId, templateId });
      if (!template) {
        return NextResponse.json(
          {
            code: "TEMPLATE_NOT_FOUND",
            message: "The selected template does not exist for this organization.",
          },
          { status: 404 }
        );
      }
    } else if (body.saveTemplate) {
      templateId = (
        await createGameTemplate({
          orgId,
          name: body.templateName,
          config: {
            mode: body.mode,
            durationMinutes: body.durationMinutes,
            wordDifficulty: body.wordDifficulty,
            teamsEnabled: body.teamsEnabled,
          },
          metricsEnabled: body.metricsEnabled ?? [],
          managerDefaults: {
            minSecondsBeforeClaim: body.minSecondsBeforeClaim,
            minSecondsBetweenClaims: body.minSecondsBetweenClaims,
            maxActiveClaimsPerPlayer: body.maxActiveClaimsPerPlayer,
            freeRefreshCooldownSeconds: body.freeRefreshCooldownSeconds,
          },
          createdByAccountId: hostUid,
        })
      ).templateId;
    }

    const { gameCode } = await createGameForHostUid({
      hostUid,
      orgId,
      templateId,
      analyticsEnabled: true,
      managerConfig: {
        mode: body.mode,
        durationMinutes: body.durationMinutes,
        wordDifficulty: body.wordDifficulty,
        teamsEnabled: body.teamsEnabled,
        metricsEnabled: body.metricsEnabled ?? [],
        minSecondsBeforeClaim: body.minSecondsBeforeClaim,
        minSecondsBetweenClaims: body.minSecondsBetweenClaims,
        maxActiveClaimsPerPlayer: body.maxActiveClaimsPerPlayer,
        freeRefreshCooldownSeconds: body.freeRefreshCooldownSeconds,
      },
    });

    await linkGameToOrganization({
      orgId,
      gameCode,
      createdByAccountId: hostUid,
      templateId: templateId ?? null,
    });

    return NextResponse.json({ gameCode, orgId, templateId: templateId ?? null }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthenticatedCreateGameError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in with Firebase before creating a company game.",
        },
        { status: 401 }
      );
    }

    if (error instanceof CreateGameAuthInfrastructureError) {
      return NextResponse.json(
        {
          code: "AUTH_VERIFICATION_FAILED",
          message: "Server could not verify Firebase auth. Check Firebase admin credential setup.",
        },
        { status: 500 }
      );
    }

    if (error instanceof GameCodeCollisionError) {
      return NextResponse.json(
        {
          code: "GAME_CODE_COLLISION",
          message: "Unable to allocate a unique game code. Please retry.",
        },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "Unable to create company game.";
    const status = message.toLowerCase().includes("missing or invalid") ? 400 : 500;

    return NextResponse.json(
      {
        code: status === 400 ? "INVALID_REQUEST" : "INTERNAL",
        message,
      },
      { status }
    );
  }
}
