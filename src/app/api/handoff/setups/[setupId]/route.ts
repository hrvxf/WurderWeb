import { NextResponse } from "next/server";

import {
  buildSetupDeepLink,
  buildSetupUniversalLink,
} from "@/domain/handoff/setup-draft";
import {
  HandoffSetupConsumedError,
  HandoffSetupExpiredError,
  HandoffSetupNotFoundError,
  requireActiveHandoffSetupDraft,
} from "@/lib/handoff/setup-drafts";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ setupId: string }> }) {
  try {
    const { setupId } = await context.params;
    const result = await requireActiveHandoffSetupDraft(setupId);
    return NextResponse.json({
      setupId: result.setupId,
      config: result.draft.config,
      expiresAtMs: result.draft.expiresAtMs,
      deepLink: buildSetupDeepLink(result.setupId),
      universalLink: buildSetupUniversalLink(result.setupId),
    });
  } catch (error) {
    if (error instanceof HandoffSetupNotFoundError) {
      return NextResponse.json(
        {
          code: "SETUP_NOT_FOUND",
          message: "Setup draft was not found.",
        },
        { status: 404 }
      );
    }

    if (error instanceof HandoffSetupExpiredError) {
      return NextResponse.json(
        {
          code: "SETUP_EXPIRED",
          message: "Setup draft expired.",
        },
        { status: 410 }
      );
    }
    if (error instanceof HandoffSetupConsumedError) {
      return NextResponse.json(
        {
          code: "SETUP_CONSUMED",
          message: "Setup draft has already been used.",
        },
        { status: 409 }
      );
    }

    console.error("[handoff:setups] Failed to load setup draft", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to read setup draft.",
      },
      { status: 500 }
    );
  }
}
