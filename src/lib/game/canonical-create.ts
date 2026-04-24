import type { HandoffFreeForAllVariant, HandoffGuildWinCondition } from "@/domain/handoff/setup-draft";
import type { CanonicalGameMode } from "@/lib/game/mode";
import type { SessionGameType } from "@/lib/game/session-type";

type CanonicalCreateManagerConfig = {
  mode?: CanonicalGameMode | "free_for_all";
  freeForAllVariant?: HandoffFreeForAllVariant;
  guildWinCondition?: HandoffGuildWinCondition;
};

type CanonicalCreatePayload = {
  gameType?: SessionGameType;
  mode?: CanonicalGameMode | "free_for_all";
  freeForAllVariant?: HandoffFreeForAllVariant;
  guildWinCondition?: HandoffGuildWinCondition;
  managerConfig?: CanonicalCreateManagerConfig;
};

type CanonicalGameDoc = {
  gameType?: SessionGameType;
  mode?: CanonicalGameMode | "free_for_all";
  freeForAllVariant?: HandoffFreeForAllVariant;
  guildWinCondition?: HandoffGuildWinCondition;
  managerConfig?: CanonicalCreateManagerConfig;
};

type CanonicalLogContext = {
  surface: string;
  stage: string;
};

export class CanonicalCreatePayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalCreatePayloadError";
  }
}

function toCanonicalPayloadSummary(payload: CanonicalCreatePayload, context: CanonicalLogContext) {
  return {
    surface: context.surface,
    stage: context.stage,
    gameType: payload.gameType ?? null,
    mode: payload.mode ?? null,
    freeForAllVariant: payload.freeForAllVariant ?? null,
    guildWinCondition: payload.guildWinCondition ?? null,
    managerConfigMode: payload.managerConfig?.mode ?? null,
    managerConfigFreeForAllVariant: payload.managerConfig?.freeForAllVariant ?? null,
    managerConfigGuildWinCondition: payload.managerConfig?.guildWinCondition ?? null,
  };
}

function toCanonicalDocSummary(gameDoc: CanonicalGameDoc, context: CanonicalLogContext) {
  return {
    surface: context.surface,
    stage: context.stage,
    gameType: gameDoc.gameType ?? null,
    mode: gameDoc.mode ?? null,
    freeForAllVariant: gameDoc.freeForAllVariant ?? null,
    guildWinCondition: gameDoc.guildWinCondition ?? null,
    managerConfigMode: gameDoc.managerConfig?.mode ?? null,
  };
}

function rejectCanonicalCreatePayload(message: string, payload: CanonicalCreatePayload, context: CanonicalLogContext): never {
  console.error("canonical_create_payload_rejected", {
    reason: message,
    ...toCanonicalPayloadSummary(payload, context),
  });
  throw new CanonicalCreatePayloadError(message);
}

export function assertCanonicalCreatePayload(
  payload: CanonicalCreatePayload,
  context: CanonicalLogContext
): CanonicalCreatePayload {
  console.info("canonical_create_payload_received", toCanonicalPayloadSummary(payload, context));

  if (!payload.mode) {
    rejectCanonicalCreatePayload("mode is required.", payload, context);
  }

  if (!payload.gameType) {
    rejectCanonicalCreatePayload("gameType is required.", payload, context);
  }

  if (payload.mode === "free_for_all" && !payload.freeForAllVariant) {
    rejectCanonicalCreatePayload("freeForAllVariant is required when mode is free_for_all.", payload, context);
  }

  if (payload.mode === "guilds" && !payload.guildWinCondition) {
    rejectCanonicalCreatePayload("guildWinCondition is required when mode is guilds.", payload, context);
  }

  if (payload.mode !== "free_for_all" && payload.freeForAllVariant) {
    rejectCanonicalCreatePayload("freeForAllVariant is only allowed when mode is free_for_all.", payload, context);
  }

  if (payload.mode !== "guilds" && payload.guildWinCondition) {
    rejectCanonicalCreatePayload("guildWinCondition is only allowed when mode is guilds.", payload, context);
  }

  if (payload.gameType === "b2b" && payload.managerConfig?.mode && payload.managerConfig.mode !== payload.mode) {
    rejectCanonicalCreatePayload("managerConfig.mode must match mode.", payload, context);
  }

  console.info("canonical_create_payload_validated", toCanonicalPayloadSummary(payload, context));
  return payload;
}

export function assertGameDocCanonicalFields(input: {
  payload: CanonicalCreatePayload;
  gameDoc: CanonicalGameDoc;
  context: CanonicalLogContext;
}) {
  const { payload, gameDoc, context } = input;
  console.info("game_doc_canonical_fields_pre_write", {
    payload: toCanonicalPayloadSummary(payload, context),
    gameDoc: toCanonicalDocSummary(gameDoc, context),
  });

  if (gameDoc.mode !== payload.mode) {
    rejectCanonicalCreatePayload("gameDoc.mode must match canonical payload mode.", payload, context);
  }

  if (gameDoc.gameType !== payload.gameType) {
    rejectCanonicalCreatePayload("gameDoc.gameType must match canonical payload gameType.", payload, context);
  }

  if (gameDoc.freeForAllVariant !== payload.freeForAllVariant) {
    rejectCanonicalCreatePayload("gameDoc.freeForAllVariant must match canonical payload freeForAllVariant.", payload, context);
  }

  if (gameDoc.guildWinCondition !== payload.guildWinCondition) {
    rejectCanonicalCreatePayload("gameDoc.guildWinCondition must match canonical payload guildWinCondition.", payload, context);
  }

  if (payload.gameType === "b2b" && gameDoc.managerConfig?.mode !== gameDoc.mode) {
    rejectCanonicalCreatePayload("managerConfig.mode must match top-level mode.", payload, context);
  }
}
