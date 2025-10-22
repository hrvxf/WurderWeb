import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

type PurchasePayload = {
  gameName: unknown;
  players: unknown;
  addons?: unknown;
};

type GameDetails = {
  name: string;
  players: number;
  addons: string[];
  price: number;
};

type StoredGameDocument = {
  code: string;
  name: string;
  maxPlayers: number;
  playerSlots: number;
  price: number;
  addons: string[];
  createdAt: string;
  started: boolean;
  players: Record<string, unknown>;
};

const ADDON_PRICE = 5;

const generateGameCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

async function isCodeTaken(code: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, "games", code));
  return snapshot.exists();
}

function getGameStorageRefs(code: string) {
  const now = new Date();
  const createdAt = now.toISOString();

  const baseYear = 2024;
  const yearBucket = String(Math.max(0, now.getUTCFullYear() - baseYear));
  const quarterBucket = String(Math.floor(now.getUTCMonth() / 3) + 1);
  const dayBucket = String(now.getUTCDate());

  const primaryRef = doc(db, "games", code);
  const archiveRef = doc(
    db,
    "games",
    yearBucket,
    quarterBucket,
    dayBucket,
    code,
    "1"
  );

  return { primaryRef, archiveRef, createdAt };
}

function buildStoredGame(code: string, data: GameDetails, createdAt: string) {
  const stored: StoredGameDocument = {
    code,
    name: data.name,
    maxPlayers: data.players,
    playerSlots: data.players,
    price: data.price,
    addons: data.addons,
    createdAt,
    started: false,
    players: {},
  };

  return stored;
}

async function saveGame(code: string, data: GameDetails) {
  const { primaryRef, archiveRef, createdAt } = getGameStorageRefs(code);
  const storedGame = buildStoredGame(code, data, createdAt);

  await Promise.all([
    setDoc(primaryRef, storedGame),
    setDoc(archiveRef, storedGame),
  ]);
}

async function getUniqueGameCode(): Promise<string> {
  let attempts = 0;
  let code = generateGameCode();

  while (attempts < 25) {
    const taken = await isCodeTaken(code);
    if (!taken) {
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
  } catch {
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

    await saveGame(gameCode, {
      name,
      players,
      addons,
      price,
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
