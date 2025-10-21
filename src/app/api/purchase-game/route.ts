import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";

type PurchasePayload = {
  gameName: unknown;
  players: unknown;
  addons?: unknown;
};

type StoredGame = {
  name: string;
  players: number;
  addons: string[];
  price: number;
  createdAt: Date;
};

const globalWithStore = globalThis as typeof globalThis & {
  __offlineGames__?: Map<string, StoredGame>;
};

const offlineGameStore =
  globalWithStore.__offlineGames__ ??
  (globalWithStore.__offlineGames__ = new Map<string, StoredGame>());

const FIRESTORE_TIMEOUT_MS = 1_000;

type FirestoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "offline" | "timeout" };

const ADDON_PRICE = 5;

const generateGameCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

function isOfflineError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    ((error as { code: string }).code === "unavailable" ||
      (error as { code: string }).code === "failed-precondition" ||
      (error as { code: string }).code === "deadline-exceeded")
  );
}

async function tryFirestore<T>(operation: () => Promise<T>): Promise<FirestoreResult<T>> {
  const opPromise: Promise<FirestoreResult<T>> = (async () => {
    try {
      const value = await operation();
      return { ok: true, value } as const;
    } catch (error) {
      if (isOfflineError(error)) {
        return { ok: false, reason: "offline" } as const;
      }

      throw error;
    }
  })();

  const timeoutPromise = new Promise<FirestoreResult<T>>((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, reason: "timeout" });
    }, FIRESTORE_TIMEOUT_MS);

    void opPromise.finally(() => clearTimeout(timer));
  });

  try {
    return await Promise.race([opPromise, timeoutPromise]);
  } catch (error) {
    // If the operation threw a non-offline error we rethrow so the caller can handle it.
    throw error;
  }
}

async function isCodeTaken(code: string): Promise<boolean> {
  const result = await tryFirestore(() => getDoc(doc(db, "games", code)));

  if (result.ok) {
    if (result.value.exists()) {
      return true;
    }

    return offlineGameStore.has(code);
  }

  return offlineGameStore.has(code);
}

async function saveGame(code: string, data: Omit<StoredGame, "createdAt">) {
  const result = await tryFirestore(() =>
    setDoc(doc(db, "games", code), {
      ...data,
      createdAt: serverTimestamp(),
    })
  );

  if (!result.ok) {
    offlineGameStore.set(code, {
      ...data,
      createdAt: new Date(),
    });
  }
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
