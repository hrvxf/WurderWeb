import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  createHandoffSetupDraftDoc,
  generateSetupId,
  HANDOFF_SETUP_COLLECTION,
  isSetupExpired,
  normalizeSetupId,
  parseHandoffSetupDraftDoc,
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

  return result;
}
