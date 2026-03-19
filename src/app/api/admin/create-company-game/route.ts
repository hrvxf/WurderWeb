import { NextResponse } from "next/server";

import { createGameTemplate, createOrganization } from "@/lib/game/company-config";
import {
  CreateGameAuthInfrastructureError,
  createGameForHostUid,
  GameCodeCollisionError,
  UnauthenticatedCreateGameError,
  verifyFirebaseAuthHeader,
} from "@/lib/game/create-game";

export const runtime = "nodejs";

type CreateCompanyGameBody = {
  orgName: string;
  templateName: string;
  mode: string;
  durationMinutes: number;
  wordDifficulty: string;
  teamsEnabled: boolean;
  metricsEnabled?: string[];
};

function toValidBody(raw: unknown): CreateCompanyGameBody {
  if (!raw || typeof raw !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const body = raw as Partial<CreateCompanyGameBody>;
  const orgName = typeof body.orgName === "string" ? body.orgName.trim() : "";
  const templateName = typeof body.templateName === "string" ? body.templateName.trim() : "";
  const mode = typeof body.mode === "string" ? body.mode.trim() : "";
  const wordDifficulty = typeof body.wordDifficulty === "string" ? body.wordDifficulty.trim() : "";
  const durationMinutes = Number(body.durationMinutes);
  const teamsEnabled = Boolean(body.teamsEnabled);
  const metricsEnabled = Array.isArray(body.metricsEnabled)
    ? body.metricsEnabled.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
    : [];

  if (!orgName || !templateName || !mode || !wordDifficulty || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Missing or invalid create-company-game fields.");
  }

  return {
    orgName,
    templateName,
    mode,
    durationMinutes,
    wordDifficulty,
    teamsEnabled,
    metricsEnabled,
  };
}

export async function POST(request: Request) {
  try {
    const hostUid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const body = toValidBody(await request.json());

    const { orgId } = await createOrganization({
      name: body.orgName,
      ownerAccountId: hostUid,
      plan: "b2b",
    });

    const { templateId } = await createGameTemplate({
      orgId,
      name: body.templateName,
      config: {
        mode: body.mode,
        durationMinutes: body.durationMinutes,
        wordDifficulty: body.wordDifficulty,
        teamsEnabled: body.teamsEnabled,
      },
      metricsEnabled: body.metricsEnabled ?? [],
    });

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
      },
    });

    return NextResponse.json({ gameCode, orgId, templateId }, { status: 201 });
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
