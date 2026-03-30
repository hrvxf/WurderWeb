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

function isActiveMembership(data: ManagerMembershipDoc, uid: string, membershipDocId?: string): boolean {
  const memberUid = asNonEmptyString(data.uid) ?? asNonEmptyString(membershipDocId);
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

    let managerMembershipDocs: Array<{ id: string; data: () => ManagerMembershipDoc }> = [];
    try {
      const indexed = await adminDb
        .collectionGroup("managers")
        .where("uid", "==", uid)
        .limit(25)
        .get();
      managerMembershipDocs = indexed.docs as typeof managerMembershipDocs;
    } catch (error) {
      console.warn("[business:workspace-access] Indexed manager query failed, using fallback", error);
      const fallback = await adminDb.collectionGroup("managers").limit(1000).get();
      managerMembershipDocs = fallback.docs as typeof managerMembershipDocs;
    }

    const hasActiveMembership = managerMembershipDocs.some((doc) =>
      isActiveMembership((doc.data() ?? {}) as ManagerMembershipDoc, uid, doc.id)
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
