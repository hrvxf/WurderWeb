import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { readEnv } from "@/lib/env";
import { parseCanonicalGameMode } from "@/lib/game/mode";
import { adminDb } from "@/lib/firebase/admin";

export type AdminHealthStatus = "healthy" | "warning" | "blocking";

export type AdminDiagnosticCheck = {
  key: string;
  label: string;
  status: AdminHealthStatus;
  reasonCodes: string[];
  message: string;
  details?: Record<string, unknown>;
};

export type GameHealthState = {
  needsRepair: boolean;
  repairSeverity: Exclude<AdminHealthStatus, "healthy"> | null;
  repairReasonCode: string | null;
  repairMessage: string | null;
  repairDetectedAt: string | null;
  repairDetectedBy: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

function checkStatus(ok: boolean, warning = false): AdminHealthStatus {
  if (ok) return "healthy";
  return warning ? "warning" : "blocking";
}

function collapseStatus(statuses: AdminHealthStatus[]): AdminHealthStatus {
  if (statuses.includes("blocking")) return "blocking";
  if (statuses.includes("warning")) return "warning";
  return "healthy";
}

function buildHealthState(game: Record<string, unknown>): GameHealthState {
  const needsRepair = asBoolean(game.needsRepair) ?? false;
  const severityValue = asString(game.repairSeverity);
  const repairSeverity = severityValue === "warning" || severityValue === "blocking" ? severityValue : null;

  return {
    needsRepair,
    repairSeverity,
    repairReasonCode: asString(game.repairReasonCode),
    repairMessage: asString(game.repairMessage),
    repairDetectedAt: timestampToIso(game.repairDetectedAt),
    repairDetectedBy: asString(game.repairDetectedBy),
  };
}

function toEventSummary(event: Record<string, unknown>) {
  return {
    timestamp: timestampToIso(event.createdAt) ?? timestampToIso(event.timestamp),
    eventType: asString(event.type) ?? asString(event.eventType),
    actor: asString(event.actorUid) ?? asString(event.actor) ?? asString(event.actorEmail),
    summary: asString(event.summary) ?? asString(event.message),
    result: asString(event.result),
    reasonCode: asString(event.reasonCode),
  };
}

function isClaimTerminal(status: string | null) {
  if (!status) return false;
  return ["resolved", "expired", "rejected", "cancelled", "terminal"].includes(status.toLowerCase());
}

export async function getAdminGameSnapshot(gameCode: string) {
  const gameRef = adminDb.collection("games").doc(gameCode);
  const [gameDoc, playersSnap, claimsSnap, eventsSnap] = await Promise.all([
    gameRef.get(),
    gameRef.collection("players").get(),
    gameRef.collection("claims").orderBy("createdAt", "desc").limit(20).get(),
    adminDb.collection("gameEvents").doc(gameCode).collection("events").orderBy("createdAt", "desc").limit(100).get(),
  ]);

  if (!gameDoc.exists) {
    return null;
  }

  const game = asRecord(gameDoc.data());
  const players = playersSnap.docs.map((doc) => {
    const player = asRecord(doc.data());
    const points = asRecord(player.points);
    return {
      id: doc.id,
      name: asString(player.name) ?? doc.id,
      alive: asBoolean(player.alive),
      removedAt: timestampToIso(player.removedAt),
      lockState: asString(player.lockState),
      activeClaimId: asString(player.activeClaimId),
      guildId: asString(player.guildId),
      classicPoints: asNumber(points.classic) ?? asNumber(player.classicPoints),
      warnings: Array.isArray(player.diagnosticWarnings)
        ? player.diagnosticWarnings.filter((item): item is string => typeof item === "string")
        : [],
    };
  });

  const health = buildHealthState(game);

  const allowSensitive = readEnv("SYSTEM_ADMIN_ALLOW_SECRET_STATE") === "true";
  const claims = claimsSnap.docs.map((doc) => {
    const claim = asRecord(doc.data());
    const status = asString(claim.status);
    return {
      id: doc.id,
      killer: asString(claim.killer),
      victim: asString(claim.victim),
      status,
      createdAt: timestampToIso(claim.createdAt),
      expiresAt: timestampToIso(claim.expiresAt),
      resolvedAt: timestampToIso(claim.resolvedAt),
      resolvedBy: asString(claim.resolvedBy),
      claimedWord: allowSensitive ? asString(claim.claimedWord) : null,
      notes: allowSensitive ? asString(claim.notes) : null,
      isTerminal: isClaimTerminal(status),
    };
  });

  const timeline = eventsSnap.docs.map((doc) => ({ id: doc.id, ...toEventSummary(asRecord(doc.data())) }));

  const aliveCountFromRoster = players.filter((player) => player.alive === true).length;

  return {
    gameCode: gameDoc.id,
    overview: {
      mode: asString(game.mode),
      phase: asString(game.phase),
      host: asString(game.hostUid) ?? asString(game.host),
      aliveCount: asNumber(game.aliveCount),
      activeRosterCount: players.length,
      startedAt: timestampToIso(game.startedAt),
      endedAt: timestampToIso(game.endedAt),
      healthBadge: health.needsRepair ? health.repairSeverity ?? "warning" : "healthy",
      health,
      aliveCountFromRoster,
    },
    players,
    claims,
    timeline,
    sensitiveFieldsVisible: allowSensitive,
  };
}

function buildDiagnosticsChecks(game: Record<string, unknown>, players: Record<string, unknown>[], claims: Record<string, unknown>[]) {
  const mode = asString(game.mode);
  const aliveCount = asNumber(game.aliveCount);
  const aliveFromPlayers = players.filter((player) => asBoolean(player.alive) === true).length;

  const aliveCountMatches = typeof aliveCount === "number" && aliveCount === aliveFromPlayers;

  const lockMismatches = players.filter((player) => {
    const lockState = asString(player.lockState);
    const activeClaimId = asString(player.activeClaimId);
    const hasActiveClaim = Boolean(activeClaimId);
    return (lockState === "locked") !== hasActiveClaim;
  });

  const hostUid = asString(game.hostUid) ?? asString(game.host);
  const hostFound = hostUid
    ? players.some((player) => asString(player.uid) === hostUid || asString(player.id) === hostUid)
    : false;

  const nonTerminalByKiller = new Map<string, number>();
  for (const claim of claims) {
    const killer = asString(claim.killer) ?? "unknown";
    if (isClaimTerminal(asString(claim.status))) continue;
    nonTerminalByKiller.set(killer, (nonTerminalByKiller.get(killer) ?? 0) + 1);
  }
  const multiClaims = [...nonTerminalByKiller.entries()].filter(([, count]) => count > 1);

  const canonicalMode = parseCanonicalGameMode(mode);
  const contractModeOk = canonicalMode != null;
  const contractPresenceOk = canonicalMode !== "classic" || players.every((player) => asString(player.contractId) || asString(player.targetId));

  const checks: AdminDiagnosticCheck[] = [
    {
      key: "assertGameIntegrity",
      label: "Full game integrity report",
      status: checkStatus(aliveCountMatches && lockMismatches.length === 0 && hostFound && multiClaims.length === 0, true),
      reasonCodes: [
        ...(!aliveCountMatches ? ["ALIVE_COUNT_MISMATCH"] : []),
        ...(lockMismatches.length > 0 ? ["LOCK_CLAIM_INCONSISTENCY"] : []),
        ...(!hostFound ? ["HOST_NOT_IN_ROSTER"] : []),
        ...(multiClaims.length > 0 ? ["MULTI_ACTIVE_CLAIMS"] : []),
      ],
      message: "Aggregated integrity check using core invariants.",
      details: {
        aliveCount,
        aliveFromPlayers,
        lockMismatchCount: lockMismatches.length,
        multiClaimPlayers: multiClaims,
      },
    },
    {
      key: "verifyAliveCount",
      label: "Verify aliveCount",
      status: checkStatus(aliveCountMatches),
      reasonCodes: aliveCountMatches ? [] : ["ALIVE_COUNT_MISMATCH"],
      message: aliveCountMatches ? "aliveCount matches current roster state." : "aliveCount does not match roster.",
      details: { aliveCount, aliveFromPlayers },
    },
    {
      key: "verifyClaimLockConsistency",
      label: "Verify claim-lock consistency",
      status: checkStatus(lockMismatches.length === 0),
      reasonCodes: lockMismatches.length === 0 ? [] : ["LOCK_CLAIM_INCONSISTENCY"],
      message:
        lockMismatches.length === 0
          ? "All lock states align with active claim references."
          : "Some players have mismatched lock state / active claim references.",
      details: { mismatches: lockMismatches.length },
    },
    {
      key: "verifyContractValidityByMode",
      label: "Verify contract validity by mode",
      status: checkStatus(contractModeOk && contractPresenceOk, !contractModeOk),
      reasonCodes: [
        ...(contractModeOk ? [] : ["UNKNOWN_GAME_MODE"]),
        ...(contractPresenceOk ? [] : ["CLASSIC_ASSIGNMENT_MISSING"]),
      ],
      message: "Mode-aware contract assignment sanity check.",
      details: { mode, contractModeOk, contractPresenceOk },
    },
    {
      key: "verifyHostAssignment",
      label: "Verify host assignment",
      status: checkStatus(hostFound),
      reasonCodes: hostFound ? [] : ["HOST_ASSIGNMENT_INVALID"],
      message: hostFound ? "Host exists in active roster." : "Host missing from active roster.",
      details: { hostUid },
    },
    {
      key: "verifySingleNonTerminalClaimPerPlayer",
      label: "Verify max one non-terminal claim per player",
      status: checkStatus(multiClaims.length === 0),
      reasonCodes: multiClaims.length === 0 ? [] : ["MULTI_ACTIVE_CLAIMS"],
      message:
        multiClaims.length === 0
          ? "No player has multiple non-terminal claims."
          : "At least one player has multiple non-terminal claims.",
      details: { offenders: multiClaims },
    },
  ];

  const summaryCodes = checks.flatMap((check) => check.reasonCodes);
  const status = collapseStatus(checks.map((check) => check.status));

  return {
    status,
    checks,
    summary: `${checks.filter((check) => check.status === "healthy").length}/${checks.length} checks healthy`,
    reasonCodes: [...new Set(summaryCodes)],
    repairRecommendations: [
      ...(aliveCountMatches ? [] : ["recomputeAliveCount"]),
      ...(lockMismatches.length > 0 ? ["unlockStuckPlayer"] : []),
      ...(contractPresenceOk ? [] : ["reissueContract"]),
    ],
  };
}

export async function runGameDiagnostics(gameCode: string) {
  const gameRef = adminDb.collection("games").doc(gameCode);
  const [gameDoc, playersSnap, claimsSnap] = await Promise.all([
    gameRef.get(),
    gameRef.collection("players").get(),
    gameRef.collection("claims").get(),
  ]);

  if (!gameDoc.exists) {
    return null;
  }

  const game = asRecord(gameDoc.data());
  const players = playersSnap.docs.map((doc) => ({ id: doc.id, ...asRecord(doc.data()) }));
  const claims = claimsSnap.docs.map((doc) => ({ id: doc.id, ...asRecord(doc.data()) }));

  return buildDiagnosticsChecks(game, players, claims);
}

async function appendGameEvent(gameCode: string, payload: Record<string, unknown>) {
  await adminDb.collection("gameEvents").doc(gameCode).collection("events").add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function setGameRepairState(input: {
  gameCode: string;
  actorUid: string;
  actorEmail: string | null;
  needsRepair: boolean;
  repairSeverity?: "warning" | "blocking" | null;
  repairReasonCode?: string | null;
  repairMessage?: string | null;
}) {
  const gameRef = adminDb.collection("games").doc(input.gameCode);
  const gameDoc = await gameRef.get();
  if (!gameDoc.exists) {
    return { ok: false as const, code: "GAME_NOT_FOUND" };
  }

  const patch = input.needsRepair
    ? {
        needsRepair: true,
        repairSeverity: input.repairSeverity ?? "warning",
        repairReasonCode: input.repairReasonCode ?? null,
        repairMessage: input.repairMessage ?? null,
        repairDetectedAt: FieldValue.serverTimestamp(),
        repairDetectedBy: input.actorUid,
      }
    : {
        needsRepair: false,
        repairSeverity: null,
        repairReasonCode: null,
        repairMessage: null,
        repairDetectedAt: null,
        repairDetectedBy: null,
      };

  await gameRef.set(patch, { merge: true });

  await appendGameEvent(input.gameCode, {
    type: input.needsRepair ? "ADMIN_REPAIR_STATE_MARKED" : "ADMIN_REPAIR_STATE_CLEARED",
    actorUid: input.actorUid,
    actorEmail: input.actorEmail,
    summary: input.needsRepair ? "Game marked as needsRepair" : "Game cleared from needsRepair",
    reasonCode: input.repairReasonCode ?? null,
    result: "ok",
    metadata: {
      needsRepair: input.needsRepair,
      repairSeverity: input.repairSeverity ?? null,
      repairMessage: input.repairMessage ?? null,
    },
  });

  return { ok: true as const };
}

export type RepairAction =
  | "recomputeAliveCount"
  | "unlockStuckPlayer"
  | "reissueContract"
  | "markNeedsRepair"
  | "clearNeedsRepair";

export async function performRepairAction(input: {
  gameCode: string;
  actorUid: string;
  actorEmail: string | null;
  action: RepairAction;
  playerId?: string;
  reasonCode?: string | null;
  message?: string | null;
  severity?: "warning" | "blocking" | null;
}) {
  const gameRef = adminDb.collection("games").doc(input.gameCode);
  const gameDoc = await gameRef.get();
  if (!gameDoc.exists) {
    return { ok: false as const, code: "GAME_NOT_FOUND", message: "Game not found." };
  }

  if (input.action === "markNeedsRepair" || input.action === "clearNeedsRepair") {
    const result = await setGameRepairState({
      gameCode: input.gameCode,
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      needsRepair: input.action === "markNeedsRepair",
      repairSeverity: input.severity ?? "warning",
      repairReasonCode: input.reasonCode ?? null,
      repairMessage: input.message ?? null,
    });

    if (!result.ok) {
      return { ok: false as const, code: result.code, message: "Game not found." };
    }

    return { ok: true as const };
  }

  if (input.action === "recomputeAliveCount") {
    const playersSnap = await gameRef.collection("players").get();
    const aliveCount = playersSnap.docs.filter((doc) => asBoolean(doc.data().alive) === true).length;
    await gameRef.set({ aliveCount }, { merge: true });
    await appendGameEvent(input.gameCode, {
      type: "ADMIN_REPAIR_RECOMPUTE_ALIVE_COUNT",
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      summary: "Recomputed aliveCount from players roster.",
      result: "ok",
      reasonCode: input.reasonCode ?? null,
      metadata: { aliveCount },
    });
    return { ok: true as const };
  }

  if (input.action === "unlockStuckPlayer") {
    const playerId = asString(input.playerId);
    if (!playerId) {
      return { ok: false as const, code: "INVALID_ARGUMENT", message: "playerId is required." };
    }

    const playerRef = gameRef.collection("players").doc(playerId);
    const playerDoc = await playerRef.get();
    if (!playerDoc.exists) {
      return { ok: false as const, code: "PLAYER_NOT_FOUND", message: "Player not found." };
    }

    const player = asRecord(playerDoc.data());
    const activeClaimId = asString(player.activeClaimId);
    const lockState = asString(player.lockState);
    const claimDoc = activeClaimId ? await gameRef.collection("claims").doc(activeClaimId).get() : null;

    const orphanedClaim = activeClaimId && (!claimDoc || !claimDoc.exists);
    const invalidLock = lockState === "locked" && !activeClaimId;

    if (!orphanedClaim && !invalidLock) {
      return {
        ok: false as const,
        code: "UNSAFE_UNLOCK_REFUSED",
        message: "Player lock appears valid; refusing unsafe unlock.",
      };
    }

    await playerRef.set({ lockState: "unlocked", activeClaimId: null }, { merge: true });
    await appendGameEvent(input.gameCode, {
      type: "ADMIN_REPAIR_UNLOCK_PLAYER",
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      summary: `Unlocked player ${playerId}`,
      result: "ok",
      reasonCode: orphanedClaim ? "ORPHANED_CLAIM_LOCK" : "LOCK_WITHOUT_CLAIM",
      metadata: { playerId, orphanedClaim, invalidLock },
    });
    return { ok: true as const };
  }

  if (input.action === "reissueContract") {
    const mode = asString(gameDoc.data()?.mode);
    if (!mode || !parseCanonicalGameMode(mode)) {
      return {
        ok: false as const,
        code: "UNSUPPORTED_MODE",
        message: "Cannot reissue contract for unknown mode.",
      };
    }

    await appendGameEvent(input.gameCode, {
      type: "ADMIN_REPAIR_REISSUE_CONTRACT",
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      summary: "Requested contract reissue using backend canonical mode logic.",
      result: "ok",
      reasonCode: input.reasonCode ?? null,
      metadata: { mode },
    });

    return { ok: true as const, warning: "Contract reissue placeholder executed without mutation." };
  }

  return { ok: false as const, code: "INVALID_ACTION", message: "Unsupported repair action." };
}
