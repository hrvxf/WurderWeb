import { NextResponse } from "next/server";

import {
  buildSetupDeepLink,
  buildSetupUniversalLink,
  parseHandoffSetupConfig,
  type HandoffSetupB2BConfig,
} from "@/domain/handoff/setup-draft";
import { createHandoffSetupDraft } from "@/lib/handoff/setup-drafts";
import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import { assertOrganizationOwner, findOrganizationTemplateById } from "@/lib/game/company-config";

export const runtime = "nodejs";

type CreateHandoffSetupRequest = {
  gameType?: string;
  mode?: string;
  freeForAllVariant?: string;
  guildWinCondition?: string;
  orgId?: string;
  templateId?: string;
  sessionType?: "host_only" | "player";
  managerConfig?: unknown;
  analyticsEnabled?: boolean;
};

function asB2BConfig(value: unknown): HandoffSetupB2BConfig | null {
  if (!value || typeof value !== "object") return null;
  const config = value as HandoffSetupB2BConfig;
  return config.gameType === "b2b" ? config : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateHandoffSetupRequest;
    const parsed = parseHandoffSetupConfig({
      gameType: body.gameType ?? "b2c",
      mode: body.mode,
      freeForAllVariant: body.freeForAllVariant,
      guildWinCondition: body.guildWinCondition,
      orgId: body.orgId,
      templateId: body.templateId,
      sessionType: body.sessionType,
      managerConfig: body.managerConfig,
      analyticsEnabled: body.analyticsEnabled,
    });

    if (!parsed) {
      return NextResponse.json(
        {
          code: "INVALID_SETUP_CONFIG",
          message:
            "Invalid setup fields. Allowed gameType: b2c|b2b. Allowed mode: classic|elimination|guilds|free_for_all. freeForAllVariant applies only to free_for_all and supports classic|survivor. guildWinCondition applies only to guilds and supports score|last_standing.",
        },
        { status: 400 }
      );
    }

    let createdByAccountId: string | null = null;
    let config = parsed;
    if (parsed.gameType === "b2b") {
      createdByAccountId = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
      await assertOrganizationOwner({ orgId: parsed.orgId, ownerAccountId: createdByAccountId });
      if (parsed.templateId) {
        const template = await findOrganizationTemplateById({ orgId: parsed.orgId, templateId: parsed.templateId });
        if (!template) {
          return NextResponse.json(
            { code: "TEMPLATE_NOT_FOUND", message: "The selected template does not exist for this organization." },
            { status: 404 }
          );
        }
      }

      const trustedB2BConfig: HandoffSetupB2BConfig = {
        gameType: "b2b",
        mode: parsed.mode,
        ...(parsed.freeForAllVariant ? { freeForAllVariant: parsed.freeForAllVariant } : {}),
        ...(parsed.guildWinCondition ? { guildWinCondition: parsed.guildWinCondition } : {}),
        orgId: parsed.orgId,
        sessionType: parsed.sessionType,
        ...(parsed.templateId ? { templateId: parsed.templateId } : {}),
        ...(parsed.managerConfig ? { managerConfig: parsed.managerConfig } : {}),
        ...(parsed.analyticsEnabled == null ? {} : { analyticsEnabled: parsed.analyticsEnabled }),
      };
      config = trustedB2BConfig;
    }

    const result = await createHandoffSetupDraft({ config, createdByAccountId });
    const b2bConfig = asB2BConfig(config);
    if (b2bConfig) {
      console.info("b2b_setup_created", {
        setupId: result.setupId,
        orgId: b2bConfig.orgId,
        templateId: b2bConfig.templateId ?? null,
        createdBy: createdByAccountId,
      });
    }
    return NextResponse.json(
      {
        setupId: result.setupId,
        config: result.draft.config,
        expiresAtMs: result.draft.expiresAtMs,
        deepLink: buildSetupDeepLink(result.setupId),
        universalLink: buildSetupUniversalLink(result.setupId),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before generating a setup QR." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json(
        { code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." },
        { status: 500 }
      );
    }
    if (error instanceof Error && error.message === "Forbidden organization access.") {
      return NextResponse.json({ code: "FORBIDDEN", message: "You do not have access to this organization." }, { status: 403 });
    }
    console.error("[handoff:setups] Failed to create setup draft", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to create setup draft.",
      },
      { status: 500 }
    );
  }
}
