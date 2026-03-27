import { NextResponse } from "next/server";

import { getCurrentUser, CurrentUserInfrastructureError, CurrentUserUnauthenticatedError } from "@/lib/auth/getCurrentUser";
import { isValidWurderId, normalizeWurderId } from "@/lib/auth/auth-helpers";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { uid } = await getCurrentUser(request.headers.get("authorization"));
    const { searchParams } = new URL(request.url);
    const wurderId = (searchParams.get("wurderId") ?? "").trim();

    if (!wurderId || !isValidWurderId(wurderId)) {
      return NextResponse.json(
        {
          code: "INVALID_WURDER_ID",
          message: "Wurder ID must be 3-20 characters using letters, numbers, or underscores.",
        },
        { status: 400 }
      );
    }

    const normalized = normalizeWurderId(wurderId);
    const lookup = await adminDb.collection("usernames").doc(normalized).get();

    if (!lookup.exists) {
      return NextResponse.json({ wurderId, normalized, available: true, ownedByCurrentUser: false });
    }

    const data = (lookup.data() ?? {}) as { uid?: unknown };
    const ownedByCurrentUser = typeof data.uid === "string" && data.uid === uid;

    return NextResponse.json({
      wurderId,
      normalized,
      available: ownedByCurrentUser,
      ownedByCurrentUser,
    });
  } catch (error) {
    if (error instanceof CurrentUserUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before checking Wurder ID availability." }, { status: 401 });
    }
    if (error instanceof CurrentUserInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[members:wurder-id:availability] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to check Wurder ID availability." }, { status: 500 });
  }
}

