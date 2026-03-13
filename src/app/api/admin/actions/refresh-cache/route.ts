import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import {
  AdminForbiddenError,
  AdminUnauthenticatedError,
  assertSystemAdmin,
} from "@/lib/auth/system-admin";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const decodedToken = await assertSystemAdmin(request.headers.get("authorization"));

    await adminDb.collection("opsAudit").add({
      action: "refresh-cache",
      actorUid: decodedToken.uid,
      actorEmail: decodedToken.email ?? null,
      source: "web-admin-console",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in with Firebase before performing admin actions.",
        },
        { status: 401 }
      );
    }

    if (error instanceof AdminForbiddenError) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "System admin access is required for this action.",
        },
        { status: 403 }
      );
    }

    console.error("[admin:refresh-cache] Failed to run privileged action", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to run admin action.",
      },
      { status: 500 }
    );
  }
}
