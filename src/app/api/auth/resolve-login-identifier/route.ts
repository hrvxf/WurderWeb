import { NextResponse } from "next/server";

import {
  InvalidIdentifierError,
  resolveSignInTarget,
  WurderIdNotFoundError,
} from "@/lib/auth/signin-identifier-resolver.server";

export const runtime = "nodejs";

type RequestBody = {
  identifier?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const identifier = typeof body.identifier === "string" ? body.identifier : "";

    const resolved = await resolveSignInTarget(identifier);
    return NextResponse.json({ mode: resolved.mode, email: resolved.email });
  } catch (error) {
    if (error instanceof InvalidIdentifierError) {
      return NextResponse.json(
        {
          code: "INVALID_IDENTIFIER",
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof WurderIdNotFoundError) {
      return NextResponse.json(
        {
          code: "WURDER_ID_NOT_FOUND",
          message: "No account found with that Wurder ID.",
        },
        { status: 404 }
      );
    }

    console.error("[auth:resolve-login-identifier] Failed", error);
    return NextResponse.json(
      {
        code: "INTERNAL",
        message: "Unable to resolve sign-in identifier.",
      },
      { status: 500 }
    );
  }
}
