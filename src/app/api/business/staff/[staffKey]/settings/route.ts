import { NextResponse } from "next/server";

import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import { parseStaffKey } from "@/lib/business/staff-identity";
import { buildStaffReadModel, clearStaffReadModelCacheForUser } from "@/lib/business/staff-read-model";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type DeleteBody = {
  confirmText?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ staffKey: string }> }) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const { staffKey } = await params;
    const identityKey = parseStaffKey(staffKey);
    if (!identityKey) {
      return NextResponse.json({ code: "INVALID_STAFF_KEY", message: "Invalid staff identifier." }, { status: 400 });
    }

    const readModel = await buildStaffReadModel(uid);
    const summary = readModel.directory.find((entry) => entry.staffKey === staffKey);
    if (!summary) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Team member not found." }, { status: 404 });
    }

    return NextResponse.json({
      teamMember: {
        staffKey: summary.staffKey,
        displayName: summary.displayName,
        orgId: summary.orgId,
        orgName: summary.orgName,
        sessionsPlayed: summary.sessionsPlayed,
      },
      permissions: {
        canDelete: true,
      },
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before loading team member settings." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }
    console.error("[business:staff:settings] GET failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load team member settings." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ staffKey: string }> }) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const { staffKey } = await params;
    const identityKey = parseStaffKey(staffKey);
    if (!identityKey) {
      return NextResponse.json({ code: "INVALID_STAFF_KEY", message: "Invalid staff identifier." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as DeleteBody;
    const confirmText = asNonEmptyString(body.confirmText);
    if (confirmText !== "DELETE") {
      return NextResponse.json(
        {
          code: "CONFIRMATION_REQUIRED",
          message: 'Deletion requires confirmText="DELETE".',
        },
        { status: 400 }
      );
    }

    const readModel = await buildStaffReadModel(uid);
    const summary = readModel.directory.find((entry) => entry.staffKey === staffKey);
    if (!summary) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Team member not found." }, { status: 404 });
    }

    const orgId = summary.orgId;
    if (!orgId) {
      return NextResponse.json({ code: "INVALID_ORG", message: "Team member is missing organisation mapping." }, { status: 400 });
    }

    const canonicalOrgRef = adminDb.collection("orgs").doc(orgId);
    const legacyOrgRef = adminDb.collection("organizations").doc(orgId);
    const [canonicalOrgSnap, legacyOrgSnap] = await Promise.all([canonicalOrgRef.get(), legacyOrgRef.get()]);
    const nowIso = new Date().toISOString();
    const payload = {
      staffKey,
      identityKey,
      displayName: summary.displayName,
      orgId,
      deletedAt: nowIso,
      deletedByAccountId: uid,
      deletedReason: "manager_team_member_delete",
      status: "deleted",
    };

    const writes: Promise<unknown>[] = [];
    if (canonicalOrgSnap.exists) {
      writes.push(canonicalOrgRef.collection("teamMembers").doc(staffKey).set(payload, { merge: true }));
    }
    if (legacyOrgSnap.exists) {
      writes.push(legacyOrgRef.collection("teamMembers").doc(staffKey).set(payload, { merge: true }));
    }
    if (writes.length === 0) {
      writes.push(canonicalOrgRef.collection("teamMembers").doc(staffKey).set(payload, { merge: true }));
    }
    writes.push(
      adminDb.collection("businessUsers").doc(uid).collection("deletedTeamMembers").doc(staffKey).set(payload, { merge: true })
    );
    await Promise.all(writes);
    clearStaffReadModelCacheForUser(uid);

    return NextResponse.json({
      ok: true,
      deleted: {
        staffKey,
        orgId,
        deletedAt: nowIso,
      },
    });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before deleting team member." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }
    console.error("[business:staff:settings] DELETE failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to delete team member." }, { status: 500 });
  }
}
