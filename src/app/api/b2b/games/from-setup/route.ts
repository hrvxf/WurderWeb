import { NextResponse } from "next/server";

import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import {
  assertOrganizationOwner,
  findOrganizationTemplateById,
  linkGameToOrganization,
} from "@/lib/game/company-config";
import {
  createGameForHostUid,
  GameCodeCollisionError,
  type ManagerConfig,
} from "@/lib/game/create-game";
import {
  assertCanonicalCreatePayload,
  CanonicalCreatePayloadError,
} from "@/lib/game/canonical-create";
import {
  consumeB2BHandoffSetupDraft,
  HandoffSetupConsumedError,
  HandoffSetupExpiredError,
  HandoffSetupNotFoundError,
} from "@/lib/handoff/setup-drafts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const hostUid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const body = (await request.json().catch(() => ({}))) as { setupId?: unknown };
    const setupId = typeof body.setupId === "string" ? body.setupId.trim() : "";
    if (!setupId) {
      return NextResponse.json({ code: "INVALID_REQUEST", message: "setupId is required." }, { status: 400 });
    }

    const consumed = await consumeB2BHandoffSetupDraft({ setupIdRaw: setupId, hostUid });
    const config = consumed.config;

    await assertOrganizationOwner({ orgId: config.orgId, ownerAccountId: hostUid });
    if (config.templateId) {
      const template = await findOrganizationTemplateById({ orgId: config.orgId, templateId: config.templateId });
      if (!template) {
        return NextResponse.json(
          { code: "TEMPLATE_NOT_FOUND", message: "The selected template does not exist for this organization." },
          { status: 404 }
        );
      }
    }

    console.info("b2b_setup_resolved", {
      setupId: consumed.setupId,
      orgId: config.orgId,
      templateId: config.templateId ?? null,
      hostUid,
    });

    const managerParticipation = config.sessionType === "player" ? "host_player" : "host_only";
    const managerConfig: ManagerConfig | undefined = config.managerConfig
      ? {
          ...config.managerConfig,
          mode: config.mode,
        }
      : undefined;

    const createPayload = {
      hostUid,
      gameType: "b2b",
      mode: config.mode,
      orgId: config.orgId,
      templateId: config.templateId,
      analyticsEnabled: config.analyticsEnabled ?? true,
      managerParticipation,
      managerConfig,
      freeForAllVariant: config.freeForAllVariant,
      guildWinCondition: config.guildWinCondition,
    } as const;
    assertCanonicalCreatePayload(createPayload, {
      surface: "b2b",
      stage: "from-setup:preCreate",
    });
    console.info("b2b_create_payload_sent", {
      surface: "b2b",
      source: "from-setup",
      gameType: createPayload.gameType,
      mode: createPayload.mode,
      orgId: config.orgId,
      templateId: config.templateId ?? null,
      managerParticipation,
      managerConfigMode: managerConfig?.mode ?? null,
      freeForAllVariant: createPayload.freeForAllVariant ?? null,
      guildWinCondition: createPayload.guildWinCondition ?? null,
      analyticsEnabled: createPayload.analyticsEnabled ?? null,
    });
    const { gameCode } = await createGameForHostUid(createPayload);

    await linkGameToOrganization({
      orgId: config.orgId,
      gameCode,
      createdByAccountId: hostUid,
      templateId: config.templateId ?? null,
    });

    console.info("b2b_setup_consumed", {
      setupId: consumed.setupId,
      consumedBy: hostUid,
      consumedAtMs: consumed.draft.consumedAtMs,
      gameCode,
    });
    console.info("b2b_create_from_setup_success", {
      setupId: consumed.setupId,
      gameCode,
      orgId: config.orgId,
      templateId: config.templateId ?? null,
      mode: config.mode,
    });

    return NextResponse.json(
      {
        gameCode,
        gameType: "b2b" as const,
        mode: config.mode,
        freeForAllVariant: config.freeForAllVariant ?? null,
        guildWinCondition: config.guildWinCondition ?? null,
        orgId: config.orgId,
        templateId: config.templateId ?? null,
        managerConfig: config.managerConfig ?? null,
        analyticsEnabled: config.analyticsEnabled ?? true,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in with Firebase before creating a business session.",
        },
        { status: 401 }
      );
    }

    if (error instanceof FirebaseAuthInfrastructureError) {
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

    if (error instanceof HandoffSetupNotFoundError) {
      return NextResponse.json(
        {
          code: "SETUP_NOT_FOUND",
          message: "The provided setupId was not found.",
        },
        { status: 404 }
      );
    }

    if (error instanceof HandoffSetupExpiredError) {
      return NextResponse.json(
        {
          code: "SETUP_EXPIRED",
          message: "The provided setupId has expired.",
        },
        { status: 410 }
      );
    }

    if (error instanceof HandoffSetupConsumedError) {
      return NextResponse.json(
        {
          code: "SETUP_CONSUMED",
          message: "The provided setupId has already been used.",
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "Forbidden organization access.") {
      return NextResponse.json({ code: "FORBIDDEN", message: "You do not have access to this organization." }, { status: 403 });
    }

    if (error instanceof Error && error.message === "SETUP_HOST_MISMATCH") {
      return NextResponse.json(
        {
          code: "SETUP_FORBIDDEN",
          message: "This setup draft can only be used by its creator.",
        },
        { status: 403 }
      );
    }

    if (error instanceof Error && error.message === "INVALID_SETUP_TYPE") {
      return NextResponse.json(
        {
          code: "INVALID_SETUP_TYPE",
          message: "setupId is not valid for b2b game creation.",
        },
        { status: 400 }
      );
    }

    if (error instanceof CanonicalCreatePayloadError) {
      return NextResponse.json(
        {
          code: "INVALID_REQUEST",
          message: error.message,
        },
        { status: 400 }
      );
    }

    console.error("[b2b:games:from-setup] Failed to create game from setup", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to create game from setup.",
      },
      { status: 500 }
    );
  }
}
