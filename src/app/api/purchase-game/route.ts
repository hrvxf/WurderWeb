import { NextRequest, NextResponse } from "next/server";

import {
  PurchaseValidationError,
  purchaseGame,
  type PurchasePayload,
} from "@/lib/purchaseGame";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let payload: PurchasePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  try {
    const result = await purchaseGame(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof PurchaseValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("Failed to process purchase", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
