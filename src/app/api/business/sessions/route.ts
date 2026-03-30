import { NextResponse } from "next/server";
import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import { buildBusinessSessionsIndexReadModel } from "@/lib/business/sessions-read-model";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    let orgRows = [] as Awaited<ReturnType<typeof buildBusinessSessionsIndexReadModel>>;
    let degraded = false;
    try {
      orgRows = await buildBusinessSessionsIndexReadModel(uid);
    } catch (error) {
      degraded = true;
      console.error("[business:sessions] Falling back to empty index due to read-model failure", error);
    }

    return NextResponse.json({
      contract: {
        name: "business-sessions-index",
        version: "2026-03-28.v1",
        compatibility: {
          routes: {
            gameDashboard: "/business/sessions/[gameCode]",
            sessionGroup: "/business/sessions/groups/[sessionGroupId]",
          },
          fieldAliases: {
            sessionId: "sessionGroupId",
          },
          precedence: ["org_session_docs", "org_game_links", "games_org_fallback"],
          identityNormalization: true,
        },
      },
      identity: {
        requesterUid: uid,
        generatedAt: new Date().toISOString(),
      },
      degraded,
      orgs: orgRows,
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "Sign in before loading business sessions.",
        },
        { status: 401 }
      );
    }

    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json(
        {
          code: "AUTH_VERIFICATION_FAILED",
          message: "Server could not verify Firebase auth.",
        },
        { status: 500 }
      );
    }

    console.error("[business:sessions] Failed", error);
    return NextResponse.json({ orgs: [], degraded: true });
  }
}
