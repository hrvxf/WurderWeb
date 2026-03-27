import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";

export const runtime = "nodejs";

type ManagerMembershipDoc = {
  uid?: unknown;
  status?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isActiveMembership(data: ManagerMembershipDoc, uid: string): boolean {
  const memberUid = asNonEmptyString(data.uid);
  const status = (asNonEmptyString(data.status) ?? "active").toLowerCase();
  return memberUid === uid && status !== "disabled";
}

export async function GET(request: Request) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));

    const [ownedCanonical, ownedLegacy] = await Promise.all([
      adminDb.collection("orgs").where("ownerAccountId", "==", uid).limit(1).get(),
      adminDb.collection("organizations").where("ownerAccountId", "==", uid).limit(1).get(),
    ]);

    if (!ownedCanonical.empty || !ownedLegacy.empty) {
      return NextResponse.json({ activated: true, source: "owner" });
    }

    const managerMembershipSnap = await adminDb
      .collectionGroup("managers")
      .where("uid", "==", uid)
      .limit(25)
      .get();

    const hasActiveMembership = managerMembershipSnap.docs.some((doc) =>
      isActiveMembership((doc.data() ?? {}) as ManagerMembershipDoc, uid)
    );

    return NextResponse.json({
      activated: hasActiveMembership,
      source: hasActiveMembership ? "manager" : "none",
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "Sign in before checking Business workspace access.",
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

    console.error("[business:workspace-access] Failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to verify Business workspace access.",
      },
      { status: 500 }
    );
  }
}
