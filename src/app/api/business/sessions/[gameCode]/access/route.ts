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
          message: "You must sign in before opening this business dashboard.",
        },
        { status: 401 }
      );
    }

    if (error instanceof ManagerForbiddenError) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: error.message || "This account is not authorized to manage this session.",
        },
        { status: 403 }
      );
    }

    if (error instanceof ManagerGameNotFoundError) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Session not found.",
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

    console.error("[business:sessions:access] Failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to verify business session access.",
      },
      { status: 500 }
    );
  }
}

