import { NextResponse } from "next/server";
import { buildAppJoinLink, buildJoinUniversalLink } from "@/domain/join/links";
import { generateJoinCode } from "@/domain/join/generateCode";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const code = generateJoinCode(6);
    const deepLink = buildAppJoinLink(code);
    const universalLink = buildJoinUniversalLink(code);

    return NextResponse.json(
      { code, deepLink, universalLink },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to generate join code", error);
    return NextResponse.json(
      { error: "Unable to generate a join code right now. Please try again." },
      { status: 500 }
    );
  }
}
