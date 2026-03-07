import { randomBytes } from "crypto";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_ATTEMPT_LIMIT = 40;
const ADDON_PRICE = 5;
const BASE_YEAR = 2024;

export type PurchasePayload = {
  gameName: unknown;
  players: unknown;
  addons?: unknown;
};

export type NormalizedPurchase = {
  name: string;
  players: number;
  addons: string[];
};

export type PurchaseResult = {
  code: string;
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
  purchase: {
    status: "active";
    purchasedAt: string;
    addons: string[];
    playerCount: number;
    amount: number;
  };
};

export class PurchaseValidationError extends Error {
  public statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "PurchaseValidationError";
  }
}

function generateCandidateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const index = bytes[i] % CODE_ALPHABET.length;
    code += CODE_ALPHABET[index];
  }

  return code;
}

async function isCodeAvailable(code: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, "games", code));
  return !snapshot.exists();
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPT_LIMIT; attempt += 1) {
    const candidate = generateCandidateCode();
    const available = await isCodeAvailable(candidate);
    if (available) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique game code after multiple attempts.");
}

function normalizeAddons(rawAddons: unknown): string[] {
  if (!Array.isArray(rawAddons)) return [];

  return rawAddons
    .map((addon) => (typeof addon === "string" ? addon.trim() : ""))
    .filter(Boolean);
}

export function validatePurchasePayload(payload: PurchasePayload): NormalizedPurchase {
  const name = typeof payload.gameName === "string" ? payload.gameName.trim() : "";
  const players = Number(payload.players);
  const addons = normalizeAddons(payload.addons);

  if (!name) {
    throw new PurchaseValidationError("Please enter a game name.");
  }

  if (!Number.isInteger(players) || players <= 0) {
    throw new PurchaseValidationError("Please select a valid number of players.");
  }

  return { name, players, addons };
}

export function calculatePrice(players: number, addonCount: number): number {
  return players + addonCount * ADDON_PRICE;
}

function createStorageRefs(code: string) {
  const now = new Date();
  const createdAt = now.toISOString();

  const yearBucket = String(Math.max(0, now.getUTCFullYear() - BASE_YEAR));
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

function buildStoredGame(
  code: string,
  data: NormalizedPurchase,
  createdAt: string,
  price: number
): StoredGameDocument {
  return {
    code,
    name: data.name,
    maxPlayers: data.players,
    playerSlots: data.players,
    price,
    addons: data.addons,
    createdAt,
    started: false,
    players: {},
    purchase: {
      status: "active",
      purchasedAt: createdAt,
      addons: data.addons,
      playerCount: data.players,
      amount: price,
    },
  };
}

async function persistGame(code: string, data: NormalizedPurchase, price: number) {
  const { primaryRef, archiveRef, createdAt } = createStorageRefs(code);
  const storedGame = buildStoredGame(code, data, createdAt, price);

  await Promise.all([setDoc(primaryRef, storedGame), setDoc(archiveRef, storedGame)]);
}

export async function purchaseGame(payload: PurchasePayload): Promise<PurchaseResult> {
  const normalized = validatePurchasePayload(payload);
  const code = await generateUniqueCode();
  const price = calculatePrice(normalized.players, normalized.addons.length);

  await persistGame(code, normalized, price);

  return {
    code,
    players: normalized.players,
    addons: normalized.addons,
    price,
  };
}
