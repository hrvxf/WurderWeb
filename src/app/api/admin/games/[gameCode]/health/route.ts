import { NextResponse } from "next/server";

import { setGameRepairState } from "@/lib/admin/game-admin";
import { AdminForbiddenError, AdminUnauthenticatedError, assertSystemAdmin } from "@/lib/auth/system-admin";

export const runtime = "nodejs";

type HealthBody = {
  needsRepair?: boolean;
  repairSeverity?: "warning" | "blocking";
  repairReasonCode?: string;
  repairMessage?: string;
};

export async function POST(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const decodedToken = await assertSystemAdmin(request.headers.get("authorization"));
    const { gameCode } = await params;
    const body = (await request.json().catch(() => ({}))) as HealthBody;

    if (typeof body.needsRepair !== "boolean") {
      return NextResponse.json(
        { code: "INVALID_ARGUMENT", message: "needsRepair boolean is required." },
        { status: 400 }
      );
    }

    const result = await setGameRepairState({
      gameCode,
      actorUid: decodedToken.uid,
      actorEmail: decodedToken.email ?? null,
      needsRepair: body.needsRepair,
      repairSeverity: body.repairSeverity ?? null,
      repairReasonCode: body.repairReasonCode ?? null,
      repairMessage: body.repairMessage ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ code: result.code, message: "Game not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
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

    console.error("[admin:games:health] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to update game health." }, { status: 500 });
  }
}
