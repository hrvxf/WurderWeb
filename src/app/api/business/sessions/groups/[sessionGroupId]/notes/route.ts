import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import {
  FirebaseAuthInfrastructureError,
  FirebaseAuthUnauthenticatedError,
  verifyFirebaseAuthHeader,
} from "@/lib/auth/verify-firebase-auth-header";
import { parseBusinessSessionGroupId } from "@/lib/business/session-groups";
import { buildBusinessSessionsIndexReadModel } from "@/lib/business/sessions-read-model";

export const runtime = "nodejs";

type SessionNotesBody = {
  notes?: unknown;
};

export async function POST(request: Request, { params }: { params: Promise<{ sessionGroupId: string }> }) {
  try {
    const uid = await verifyFirebaseAuthHeader(request.headers.get("authorization"));
    const { sessionGroupId } = await params;
    const parsed = parseBusinessSessionGroupId(sessionGroupId);
    if (!parsed) {
      return NextResponse.json({ code: "INVALID_SESSION_GROUP_ID", message: "Invalid session group identifier." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as SessionNotesBody;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length > 4000) {
      return NextResponse.json({ code: "NOTES_TOO_LONG", message: "Session notes must be 4000 characters or fewer." }, { status: 400 });
    }

    const orgs = await buildBusinessSessionsIndexReadModel(uid);
    const orgRow = orgs.find((row) => row.org.orgId === parsed.orgId);
    const session = orgRow?.sessions.find((row) => row.sessionGroupId === sessionGroupId);
    if (!orgRow || !session) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Session group not found." }, { status: 404 });
    }

    const payload = {
      notes,
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
      orgId: orgRow.org.orgId,
      sessionGroupId,
      sourceSessionId: session.sourceSessionId,
      sessionType: session.sessionType,
      identitySource: session.identitySource,
    };

    const batch = adminDb.batch();
    batch.set(adminDb.collection("orgs").doc(orgRow.org.orgId).collection("sessionNotes").doc(sessionGroupId), payload, { merge: true });
    batch.set(adminDb.collection("organizations").doc(orgRow.org.orgId).collection("sessionNotes").doc(sessionGroupId), payload, { merge: true });
    await batch.commit();

    return NextResponse.json({ ok: true, notes: payload.notes, updatedAt: payload.updatedAt, updatedBy: payload.updatedBy });
  } catch (error) {
    if (error instanceof FirebaseAuthUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before writing session notes." }, { status: 401 });
    }
    if (error instanceof FirebaseAuthInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }

    console.error("[business:sessions:notes] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to save session notes." }, { status: 500 });
  }
}
