import { NextResponse } from "next/server";

import { performRepairAction, type RepairAction } from "@/lib/admin/game-admin";
import { AdminForbiddenError, AdminUnauthenticatedError, assertSystemAdmin } from "@/lib/auth/system-admin";

export const runtime = "nodejs";

type RepairBody = {
  action?: RepairAction;
  playerId?: string;
  reasonCode?: string;
  message?: string;
  severity?: "warning" | "blocking";
};

export async function POST(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const decodedToken = await assertSystemAdmin(request.headers.get("authorization"));
    const { gameCode } = await params;
    const body = (await request.json().catch(() => ({}))) as RepairBody;

    if (!body.action) {
      return NextResponse.json({ code: "INVALID_ARGUMENT", message: "action is required." }, { status: 400 });
    }

    const result = await performRepairAction({
      gameCode,
      actorUid: decodedToken.uid,
      actorEmail: decodedToken.email ?? null,
      action: body.action,
      playerId: body.playerId,
      reasonCode: body.reasonCode ?? null,
      message: body.message ?? null,
      severity: body.severity ?? null,
    });

    if (!result.ok) {
      const status = result.code === "GAME_NOT_FOUND" || result.code === "PLAYER_NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ code: result.code, message: result.message }, { status });
    }

    return NextResponse.json({ ok: true, warning: "warning" in result ? result.warning : null });
  } catch (error) {
    if (error instanceof AdminUnauthenticatedError) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "You must sign in with Firebase before performing admin actions." },
        { status: 401 }
      );
    }

    if (error instanceof AdminForbiddenError) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "System admin access is required for this action." },
        { status: 403 }
      );
    }

    console.error("[admin:games:repairs] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to run repair action." }, { status: 500 });
  }
}
