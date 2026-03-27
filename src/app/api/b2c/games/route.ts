import { NextResponse } from "next/server";
import {
  createGameForHostUid,
  GameCodeCollisionError,
} from "@/lib/game/create-game";
import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const hostUid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const result = await createGameForHostUid({ hostUid, gameType: "b2c" });
    return NextResponse.json({ ...result, gameType: "b2c" as const }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown b2c create-game error.";

    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in with Firebase before creating a game.",
        },
        { status: 401 }
      );
    }

    if (error instanceof FirebaseAuthInfrastructureError) {
      console.error("[b2c:games] Server auth verification misconfigured", error);
      return NextResponse.json(
        {
          code: "AUTH_VERIFICATION_FAILED",
          message: "Server could not verify Firebase auth. Check Firebase admin credential setup.",
          detail: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    if (error instanceof GameCodeCollisionError) {
      return NextResponse.json(
        {
          code: "GAME_CODE_COLLISION",
          message: "Unable to allocate a unique game code. Please retry.",
        },
        { status: 409 }
      );
    }

    console.error("[b2c:games] Failed to create game document", error);
    const lowerMessage = errorMessage.toLowerCase();
    if (
      lowerMessage.includes("could not load the default credentials") ||
      lowerMessage.includes("failed to determine service account") ||
      lowerMessage.includes("service account") ||
      lowerMessage.includes("insufficient permission") ||
      lowerMessage.includes("permission-denied")
    ) {
      return NextResponse.json(
        {
          code: "ADMIN_CREDENTIALS_MISSING",
          message: "Server Firebase Admin credentials are missing or invalid.",
          detail: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        code: "FIREBASE_WRITE_FAILED",
        message: "Failed to create game in Firestore.",
        detail: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
