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
export const preferredRegion = ["lhr1", "fra1"];
let hasHandledSetupFetchRequest = false;

function resolveSetupFetchRegion(): string | null {
  return (
    process.env.VERCEL_REGION ??
    process.env.FUNCTION_REGION ??
    process.env.AWS_REGION ??
    process.env.GCLOUD_REGION ??
    null
  );
}

function resolveFirestoreDatabaseRegion(): string | null {
  return (
    process.env.FIRESTORE_DATABASE_REGION ??
    process.env.FIREBASE_FIRESTORE_REGION ??
    process.env.FIRESTORE_REGION ??
    process.env.GCLOUD_REGION ??
    null
  );
}

export async function GET(_request: Request, context: { params: Promise<{ setupId: string }> }) {
  const setupFetchRouteStartedAtMs = Date.now();
  const setupFetchColdStart = !hasHandledSetupFetchRequest;
  hasHandledSetupFetchRequest = true;
  let setupIdForLog: string | null = null;
  try {
    const { setupId } = await context.params;
    setupIdForLog = setupId;
    console.info("setup_fetch_route_started", {
      setupId,
      setup_fetch_cold_start: setupFetchColdStart,
      setup_fetch_region: resolveSetupFetchRegion(),
      firestore_database_region: resolveFirestoreDatabaseRegion(),
    });
    const setupFetchAdminReadyMs = Math.max(0, Date.now() - setupFetchRouteStartedAtMs);
    console.info("setup_fetch_admin_ready_ms", {
      setupId,
      setup_fetch_admin_ready_ms: setupFetchAdminReadyMs,
      setup_fetch_cold_start: setupFetchColdStart,
    });
    let firestoreReadMs: number | null = null;
    const result = await requireActiveHandoffSetupDraft(setupId, {
      onFirestoreReadMs: (ms) => {
        firestoreReadMs = ms;
      },
    });
    console.info("setup_fetch_firestore_read_ms", {
      setupId,
      setup_fetch_firestore_read_ms: firestoreReadMs,
      setup_fetch_cold_start: setupFetchColdStart,
    });
    console.info("setup_fetch_total_ms", {
      setupId,
      setup_fetch_total_ms: Math.max(0, Date.now() - setupFetchRouteStartedAtMs),
      setup_fetch_cold_start: setupFetchColdStart,
      setup_fetch_region: resolveSetupFetchRegion(),
      firestore_database_region: resolveFirestoreDatabaseRegion(),
    });
    return NextResponse.json({
      setupId: result.setupId,
      config: result.draft.config,
      expiresAtMs: result.draft.expiresAtMs,
      deepLink: buildSetupDeepLink(result.setupId),
      universalLink: buildSetupUniversalLink(result.setupId),
    });
  } catch (error) {
    if (error instanceof HandoffSetupNotFoundError) {
      console.info("setup_fetch_total_ms", {
        setupId: setupIdForLog,
        setup_fetch_total_ms: Math.max(0, Date.now() - setupFetchRouteStartedAtMs),
        setup_fetch_cold_start: setupFetchColdStart,
        setup_fetch_region: resolveSetupFetchRegion(),
        firestore_database_region: resolveFirestoreDatabaseRegion(),
      });
      return NextResponse.json(
        {
          code: "SETUP_NOT_FOUND",
          message: "Setup draft was not found.",
        },
        { status: 404 }
      );
    }

    if (error instanceof HandoffSetupExpiredError) {
      console.info("setup_fetch_total_ms", {
        setupId: setupIdForLog,
        setup_fetch_total_ms: Math.max(0, Date.now() - setupFetchRouteStartedAtMs),
        setup_fetch_cold_start: setupFetchColdStart,
        setup_fetch_region: resolveSetupFetchRegion(),
        firestore_database_region: resolveFirestoreDatabaseRegion(),
      });
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

    console.info("setup_fetch_total_ms", {
      setupId: setupIdForLog,
      setup_fetch_total_ms: Math.max(0, Date.now() - setupFetchRouteStartedAtMs),
      setup_fetch_cold_start: setupFetchColdStart,
      setup_fetch_region: resolveSetupFetchRegion(),
      firestore_database_region: resolveFirestoreDatabaseRegion(),
    });
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
