import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

type PurchasePayload = {
  gameName: unknown;
  players: unknown;
  addons?: unknown;
};

const ADDON_PRICE = 5;

const generateGameCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

async function getUniqueGameCode(): Promise<string> {
  let attempts = 0;
  let code = generateGameCode();

  while (attempts < 25) {
    const docRef = doc(db, "games", code);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return code;
    }

    code = generateGameCode();
    attempts += 1;
  }

  throw new Error("Unable to generate a unique game code. Please try again.");
}

function normalizeAddons(rawAddons: unknown): string[] {
  if (!Array.isArray(rawAddons)) return [];

  return rawAddons
    .map((addon) => (typeof addon === "string" ? addon.trim() : ""))
    .filter(Boolean);
}

function calculatePrice(players: number, addonCount: number) {
  return players + addonCount * ADDON_PRICE;
}

export async function POST(request: NextRequest) {
  let payload: PurchasePayload;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const name = typeof payload.gameName === "string" ? payload.gameName.trim() : "";
  const players = Number(payload.players);
  const addons = normalizeAddons(payload.addons);

  if (!name) {
    return NextResponse.json(
      { error: "Please enter a game name." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(players) || players <= 0) {
    return NextResponse.json(
      { error: "Please select a valid number of players." },
      { status: 400 }
    );
  }

  try {
    const gameCode = await getUniqueGameCode();
    const price = calculatePrice(players, addons.length);

    await setDoc(doc(db, "games", gameCode), {
      name,
      players,
      addons,
      price,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({
      code: gameCode,
      players,
      addons,
      price,
    });
  } catch (error) {
    console.error("Failed to process purchase", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
