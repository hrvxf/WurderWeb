import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  createHandoffSetupDraftDoc,
  generateSetupId,
  HANDOFF_SETUP_COLLECTION,
  isSetupExpired,
  normalizeSetupId,
  parseHandoffSetupDraftDoc,
  type HandoffSetupB2BConfig,
  type HandoffSetupConfig,
  type HandoffSetupDraftDoc,
} from "@/domain/handoff/setup-draft";

const MAX_SETUP_ID_ATTEMPTS = 6;

export class HandoffSetupNotFoundError extends Error {
  constructor(message = "Setup draft was not found.") {
    super(message);
    this.name = "HandoffSetupNotFoundError";
  }
}

export class HandoffSetupExpiredError extends Error {
  constructor(message = "Setup draft has expired.") {
    super(message);
    this.name = "HandoffSetupExpiredError";
  }
}

export class HandoffSetupConsumedError extends Error {
  constructor(message = "Setup draft has already been consumed.") {
    super(message);
    this.name = "HandoffSetupConsumedError";
  }
}

export async function createHandoffSetupDraft(input: {
  config: HandoffSetupConfig;
  createdByAccountId?: string | null;
}): Promise<{ setupId: string; draft: HandoffSetupDraftDoc }> {
  for (let attempt = 0; attempt < MAX_SETUP_ID_ATTEMPTS; attempt += 1) {
    const setupId = generateSetupId();
    const docRef = adminDb.collection(HANDOFF_SETUP_COLLECTION).doc(setupId);

    const created = await adminDb.runTransaction(async (tx) => {
      const existing = await tx.get(docRef);
      if (existing.exists) return null;

      const draft = createHandoffSetupDraftDoc({
        config: input.config,
        createdByAccountId: input.createdByAccountId ?? null,
      });

      tx.set(docRef, draft);
      return draft;
    });

    if (created) {
      return { setupId, draft: created };
    }
  }

  throw new Error("Could not allocate a unique setupId.");
}

type HandoffSetupReadTelemetry = {
  onFirestoreReadMs?: (ms: number) => void;
};

export async function readHandoffSetupDraft(
  setupIdRaw: unknown,
  telemetry?: HandoffSetupReadTelemetry,
): Promise<{ setupId: string; draft: HandoffSetupDraftDoc } | null> {
  const setupId = normalizeSetupId(setupIdRaw);
  if (!setupId) return null;

  const firestoreReadStartedAtMs = Date.now();
  const snapshot = await adminDb.collection(HANDOFF_SETUP_COLLECTION).doc(setupId).get();
  telemetry?.onFirestoreReadMs?.(Math.max(0, Date.now() - firestoreReadStartedAtMs));
  if (!snapshot.exists) return null;

  const draft = parseHandoffSetupDraftDoc(snapshot.data());
  if (!draft) return null;
  return { setupId, draft };
}

export async function requireActiveHandoffSetupDraft(
  setupIdRaw: unknown,
  telemetry?: HandoffSetupReadTelemetry,
): Promise<{ setupId: string; draft: HandoffSetupDraftDoc }> {
  const result = await readHandoffSetupDraft(setupIdRaw, telemetry);
  if (!result) {
    throw new HandoffSetupNotFoundError();
  }

  if (isSetupExpired(result.draft.expiresAtMs)) {
    throw new HandoffSetupExpiredError();
  }
  if (result.draft.consumedAtMs != null) {
    throw new HandoffSetupConsumedError();
  }

  return result;
}

export async function consumeB2BHandoffSetupDraft(input: {
  setupIdRaw: unknown;
  hostUid: string;
}): Promise<{ setupId: string; draft: HandoffSetupDraftDoc; config: HandoffSetupB2BConfig }> {
  const setupId = normalizeSetupId(input.setupIdRaw);
  if (!setupId) throw new HandoffSetupNotFoundError();

  const ref = adminDb.collection(HANDOFF_SETUP_COLLECTION).doc(setupId);
  const nowMs = Date.now();
  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HandoffSetupNotFoundError();
    const parsed = parseHandoffSetupDraftDoc(snap.data());
    if (!parsed) throw new HandoffSetupNotFoundError();
    if (parsed.config.gameType !== "b2b") {
      throw new Error("INVALID_SETUP_TYPE");
    }
    if (isSetupExpired(parsed.expiresAtMs, nowMs)) throw new HandoffSetupExpiredError();
    if (parsed.consumedAtMs != null) throw new HandoffSetupConsumedError();
    if (parsed.createdByAccountId && parsed.createdByAccountId !== input.hostUid) {
      throw new Error("SETUP_HOST_MISMATCH");
    }

    tx.update(ref, {
      consumedAtMs: nowMs,
      consumedByAccountId: input.hostUid,
      updatedAtMs: nowMs,
    });

    return {
      setupId,
      draft: {
        ...parsed,
        consumedAtMs: nowMs,
        consumedByAccountId: input.hostUid,
        updatedAtMs: nowMs,
      },
      config: parsed.config,
    };
  });

  return result as { setupId: string; draft: HandoffSetupDraftDoc; config: HandoffSetupB2BConfig };
}
