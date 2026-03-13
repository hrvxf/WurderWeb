import { NextResponse } from "next/server";

import { runGameDiagnostics } from "@/lib/admin/game-admin";
import { AdminForbiddenError, AdminUnauthenticatedError, assertSystemAdmin } from "@/lib/auth/system-admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    await assertSystemAdmin(request.headers.get("authorization"));
    const { gameCode } = await params;
    const diagnostics = await runGameDiagnostics(gameCode);

    if (!diagnostics) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Game not found." }, { status: 404 });
    }

    return NextResponse.json({ diagnostics });
  } catch (error) {
    if (error instanceof AdminUnauthenticatedError) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "You must sign in with Firebase before performing admin diagnostics." },
        { status: 401 }
      );
    }

    if (error instanceof AdminForbiddenError) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "System admin access is required for diagnostics." },
        { status: 403 }
      );
    }

    console.error("[admin:games:diagnostics] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to run diagnostics." }, { status: 500 });
  }
}
