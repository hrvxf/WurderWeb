import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

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
    const normalizedCode = gameCode.trim();
    const access = await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);

    if (!normalizedCode) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Game code is required." },
        { status: 400 }
      );
    }

    const gameRef = adminDb.collection("games").doc(normalizedCode);
    const result = await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(gameRef);
      if (!snapshot.exists) {
        throw new ManagerGameNotFoundError("Game not found.");
      }

      const data = (snapshot.data() ?? {}) as { ended?: unknown; status?: unknown };
      const alreadyEnded = data.ended === true || data.status === "ended";
      if (alreadyEnded) {
        return { alreadyEnded: true };
      }

      tx.set(
        gameRef,
        {
          ended: true,
          status: "ended",
          endedAt: FieldValue.serverTimestamp(),
          paused: false,
          pausedAt: null,
          pausedBy: null,
          lastActionAt: Date.now(),
          endedByAccountId: access.uid,
          endedReason: "manager_manual",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return { alreadyEnded: false };
    });

    try {
      const refreshedGame = (await gameRef.get()).data() ?? {};
      await buildAndCacheManagerDashboard({
        gameCode: normalizedCode,
        includeTimeline: true,
        game: refreshedGame,
        analyticsEventLimit: 200,
        buildReason: "end_game",
      });
    } catch (cacheError) {
      console.warn("[manager:end] Cache rebuild failed", { gameCode: normalizedCode, cacheError });
    }

    return NextResponse.json({
      ok: true,
      gameCode: normalizedCode,
      alreadyEnded: result.alreadyEnded,
    });
  } catch (error) {
    if (error instanceof ManagerUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in before ending this game.",
        },
        { status: 401 }
      );
    }

    if (error instanceof ManagerForbiddenError) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: error.message || "This account is not authorized to manage this game.",
        },
        { status: 403 }
      );
    }

    if (error instanceof ManagerGameNotFoundError) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Game not found.",
        },
        { status: 404 }
      );
    }

    if (error instanceof ManagerAccessInfrastructureError) {
      return NextResponse.json(
        {
          code: "AUTH_VERIFICATION_FAILED",
          message: "Server could not verify Firebase auth.",
        },
        { status: 500 }
      );
    }

    console.error("[manager:end] Failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to end this game right now.",
      },
      { status: 500 }
    );
  }
}
