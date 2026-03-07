import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: process.env.APPLE_TEAM_BUNDLE_ID || "TEAMID.com.wurder.app",
          paths: ["/join/*"],
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
