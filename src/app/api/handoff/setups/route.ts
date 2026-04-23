import { NextResponse } from "next/server";

import {
  buildSetupDeepLink,
  buildSetupUniversalLink,
  parseHandoffSetupConfig,
} from "@/domain/handoff/setup-draft";
import { createHandoffSetupDraft } from "@/lib/handoff/setup-drafts";

export const runtime = "nodejs";

type CreateHandoffSetupRequest = {
  gameType?: string;
  mode?: string;
  freeForAllVariant?: string;
  guildWinCondition?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateHandoffSetupRequest;
    const config = parseHandoffSetupConfig({
      gameType: body.gameType ?? "b2c",
      mode: body.mode ?? "classic",
      freeForAllVariant: body.freeForAllVariant,
      guildWinCondition: body.guildWinCondition,
    });

    if (!config) {
      return NextResponse.json(
        {
          code: "INVALID_SETUP_CONFIG",
          message:
            "Invalid setup fields. Allowed gameType: b2c|b2b. Allowed mode: classic|elimination|elimination_multi|guilds|free_for_all. freeForAllVariant applies only to free_for_all and supports classic|survivor. guildWinCondition applies only to guilds and supports score|last_standing.",
        },
        { status: 400 }
      );
    }

    const result = await createHandoffSetupDraft({ config });
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
