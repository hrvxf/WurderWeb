import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { buildAndCacheManagerDashboard } from "@/lib/manager/dashboard-cache";
import {
  assertManagerAccessForGame,
  ManagerAccessInfrastructureError,
  ManagerForbiddenError,
  ManagerGameNotFoundError,
  ManagerUnauthenticatedError,
} from "@/lib/manager/access";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const { gameCode } = await params;
    const normalizedCode = gameCode.trim().toUpperCase();
    await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);

    const gameSnapshot = await adminDb.collection("games").doc(normalizedCode).get();
    const game = (gameSnapshot.data() ?? {}) as Record<string, unknown>;
    const rebuilt = await buildAndCacheManagerDashboard({
      gameCode: normalizedCode,
      includeTimeline: true,
      game,
      analyticsEventLimit: 200,
      buildReason: "manual_rebuild_endpoint",
    });

    return NextResponse.json({
      ok: true,
      gameCode: normalizedCode,
      stats: {
        playerRows: rebuilt.playerRows,
        eventRows: rebuilt.eventRows,
        usedFallback: rebuilt.usedFallback,
      },
    });
  } catch (error) {
    if (error instanceof ManagerUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "You must sign in first." }, { status: 401 });
    }
    if (error instanceof ManagerForbiddenError) {
      return NextResponse.json({ code: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof ManagerGameNotFoundError) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Game not found." }, { status: 404 });
    }
    if (error instanceof ManagerAccessInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[manager:dashboard:rebuild] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to rebuild dashboard cache." }, { status: 500 });
  }
}
