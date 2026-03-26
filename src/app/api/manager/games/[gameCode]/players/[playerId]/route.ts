import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { buildAndCacheManagerDashboard, loadManagerDashboardCache } from "@/lib/manager/dashboard-cache";
import {
  assertManagerAccessForGame,
  ManagerAccessInfrastructureError,
  ManagerForbiddenError,
  ManagerGameNotFoundError,
  ManagerUnauthenticatedError,
} from "@/lib/manager/access";

export const runtime = "nodejs";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameCode: string; playerId: string }> }
) {
  try {
    const { gameCode, playerId } = await params;
    const normalizedCode = gameCode.trim().toUpperCase();
    const normalizedPlayerId = decodeURIComponent(playerId).trim();
    await assertManagerAccessForGame(request.headers.get("authorization"), normalizedCode);

    const gameDoc = await adminDb.collection("games").doc(normalizedCode).get();
    const game = (gameDoc.data() ?? {}) as { orgId?: unknown };
    const orgId = asNonEmptyString(game.orgId);
    if (!orgId) {
      return NextResponse.json({ code: "ORG_NOT_FOUND", message: "Game is not linked to an organization." }, { status: 404 });
    }

    const currentDashboard =
      (await loadManagerDashboardCache(normalizedCode)) ??
      {
        analytics: (
          await buildAndCacheManagerDashboard({
            gameCode: normalizedCode,
            includeTimeline: true,
            game,
            analyticsEventLimit: 200,
            buildReason: "player_drilldown",
          })
        ).analytics,
      };

    const currentPlayer =
      currentDashboard.analytics.playerPerformance.find((player) => player.playerId === normalizedPlayerId) ??
      null;
    if (!currentPlayer) {
      return NextResponse.json({ code: "PLAYER_NOT_FOUND", message: "Player was not found in dashboard analytics." }, { status: 404 });
    }

    const cachedDashboards = await adminDb.collection("managerDashboard").where("orgId", "==", orgId).limit(200).get();
    const history = cachedDashboards.docs
      .map((doc) => doc.data())
      .map((row) => {
        const gameCodeValue = asNonEmptyString(row.gameCode);
        const analytics = row.analytics as {
          updatedAt?: unknown;
          playerPerformance?: Array<Record<string, unknown>>;
        };
        const players = Array.isArray(analytics?.playerPerformance) ? analytics.playerPerformance : [];
        const player = players.find((entry) => asNonEmptyString(entry.playerId) === normalizedPlayerId);
        if (!gameCodeValue || !player) return null;
        return {
          gameCode: gameCodeValue,
          updatedAt: typeof analytics.updatedAt === "string" ? analytics.updatedAt : null,
          kills: Number(player.kills ?? 0) || 0,
          deaths: Number(player.deaths ?? 0) || 0,
          kdRatio: Number.isFinite(Number(player.kdRatio)) ? Number(player.kdRatio) : null,
          accuracyRatio: Number.isFinite(Number(player.accuracyRatio)) ? Number(player.accuracyRatio) : null,
          disputeRateRatio: Number.isFinite(Number(player.disputeRateRatio)) ? Number(player.disputeRateRatio) : null,
          claimsSubmitted: Number(player.claimsSubmitted ?? 0) || 0,
          claimsConfirmed: Number(player.claimsConfirmed ?? 0) || 0,
          claimsDenied: Number(player.claimsDenied ?? 0) || 0,
          sessionCount: Number(player.sessionCount ?? 0) || 0,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry != null)
      .sort((a, b) => {
        const aMs = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bMs = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bMs - aMs;
      })
      .slice(0, 60);

    const timeline = (currentDashboard.analytics.timeline ?? []).filter((event) => {
      const actorId = event.actorId?.trim();
      const actorName = event.actorName?.trim().toLowerCase();
      return actorId === normalizedPlayerId || actorName === currentPlayer.displayName.trim().toLowerCase();
    });

    const coachingDoc = await adminDb.collection("orgs").doc(orgId).collection("managerCoachingNotes").doc(normalizedPlayerId).get();
    const coachingData = (coachingDoc.data() ?? {}) as { notes?: unknown; updatedAt?: unknown };

    return NextResponse.json({
      gameCode: normalizedCode,
      orgId,
      player: currentPlayer,
      history,
      claimTimeline: timeline,
      coachingNotes: {
        notes: asNonEmptyString(coachingData.notes) ?? "",
        updatedAt: typeof coachingData.updatedAt === "string" ? coachingData.updatedAt : null,
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

    console.error("[manager:player-drilldown] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load player drill-down." }, { status: 500 });
  }
}
