import { NextResponse } from "next/server";

import {
  assertManagerAccessForGame,
  ManagerAccessInfrastructureError,
  ManagerForbiddenError,
  ManagerGameNotFoundError,
  ManagerUnauthenticatedError,
} from "@/lib/manager/access";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ gameCode: string }> }) {
  try {
    const { gameCode } = await params;
    const access = await assertManagerAccessForGame(request.headers.get("authorization"), gameCode);

    return NextResponse.json({
      ok: true,
      gameCode,
      ownershipSource: access.ownershipSource,
    });
  } catch (error) {
    if (error instanceof ManagerUnauthenticatedError) {
      return NextResponse.json(
        {
          code: "UNAUTHENTICATED",
          message: "You must sign in before opening this manager dashboard.",
        },
        { status: 401 }
      );
    }

    if (error instanceof ManagerForbiddenError) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: error.message || "This account is not authorized to manage this game.",
        },
        { status: 403 }
      );
    }

    if (error instanceof ManagerGameNotFoundError) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Game not found.",
        },
        { status: 404 }
      );
    }

    if (error instanceof ManagerAccessInfrastructureError) {
      return NextResponse.json(
        {
          code: "AUTH_VERIFICATION_FAILED",
          message: "Server could not verify Firebase auth.",
        },
        { status: 500 }
      );
    }

    console.error("[manager:access] Failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to verify manager access.",
      },
      { status: 500 }
    );
  }
}
