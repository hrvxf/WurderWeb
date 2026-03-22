import { NextResponse } from "next/server";

import {
  AUTH_SESSION_COOKIE_NAME,
  createSessionCookieFromAuthorization,
  getClearedSessionCookieOptions,
  getSessionCookieOptions,
} from "@/lib/auth/server-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const sessionCookie = await createSessionCookieFromAuthorization(
      request.headers.get("authorization")
    );

    if (!sessionCookie) {
      return NextResponse.json(
        { code: "UNAUTHENTICATED", message: "Missing Firebase bearer token." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      AUTH_SESSION_COOKIE_NAME,
      sessionCookie,
      getSessionCookieOptions()
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        code: "INVALID_TOKEN",
        message: error instanceof Error ? error.message : "Unable to create auth session.",
      },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", getClearedSessionCookieOptions());
  return response;
}
