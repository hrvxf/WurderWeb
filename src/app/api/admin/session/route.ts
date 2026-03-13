import { NextResponse } from "next/server";

import {
  AdminForbiddenError,
  AdminUnauthenticatedError,
  assertSystemAdmin,
} from "@/lib/auth/system-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const decodedToken = await assertSystemAdmin(request.headers.get("authorization"));

    return NextResponse.json({
      uid: decodedToken.uid,
      email: decodedToken.email ?? null,
      isSystemAdmin: true,
    });
  } catch (error) {
    if (error instanceof AdminUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in with Firebase before accessing system admin.",
        },
        { status: 401 }
      );
    }

    if (error instanceof AdminForbiddenError) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "System admin access is restricted to authorized accounts.",
        },
        { status: 403 }
      );
    }

    console.error("[admin:session] Failed to verify system admin session", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to verify system admin session.",
      },
      { status: 500 }
    );
  }
}
