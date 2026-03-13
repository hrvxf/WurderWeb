import { NextResponse } from "next/server";

import { AdminForbiddenError, AdminUnauthenticatedError, assertSystemAdmin } from "@/lib/auth/system-admin";
import { getAdminGameSnapshot } from "@/lib/admin/game-admin";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    await assertSystemAdmin(request.headers.get("authorization"));
    const { gameCode } = await params;
    const snapshot = await getAdminGameSnapshot(gameCode);

    if (!snapshot) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Game not found." }, { status: 404 });
    }

    return NextResponse.json({ game: snapshot });
  } catch (error) {
    if (error instanceof AdminUnauthenticatedError) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "You must sign in with Firebase before accessing system admin." },
        { status: 401 }
      );
    }
    if (error instanceof AdminForbiddenError) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "System admin access is restricted to authorized accounts." },
        { status: 403 }
      );
    }

    console.error("[admin:games:snapshot] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load game snapshot." }, { status: 500 });
  }
}
