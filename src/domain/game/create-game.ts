import type { Firestore } from "firebase-admin/firestore";

const GAME_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GAME_CODE_LENGTH = 6;

type WordStyle = "classic" | "chaos" | "naughty";

type WordGroupDoc = {
  name?: unknown;
  style?: unknown;
  enabled?: unknown;
};

const DEFAULT_CLASSIC_WORD_GROUP_TTL_MS = 5 * 60 * 1000;

let cachedDefaultClassicWordGroup:
  | { value: string | null; expiresAt: number }
  | null = null;
let inFlightDefaultClassicWordGroupLookup: Promise<string | null> | null = null;

export type CreateGameDoc = {
  gameCode: string;
  hostPlayerId: string;
  version: number;
  started: false;
  ended: false;
  winnerPlayerId: null;
  startedAt: null;
  endedAt: null;
  createdAt: FirebaseFirestore.FieldValue;
  startedBy: null;
  aliveCount: number;
  assignmentsCommitted: false;
  wordGroupId: string | null;
  wordStyle: "classic";
  wordGroupLocked: false;
  lastActionAt: number;
  mode: "classic";
  classicMaxHuntersPerVictim: number;
  classicPointsToWin: number;
  classicEndAt: null;
  lobbyCountdownEndsAt: null;
  lobbyCountdownStartedBy: null;
  lobbyCountdownPausedRemainingMs: null;
  paused: false;
  pausedAt: null;
  pausedBy: null;
};

export function generateGameCode(): string {
  let code = "";
  for (let index = 0; index < GAME_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * GAME_CODE_CHARS.length);
    code += GAME_CODE_CHARS[randomIndex];
  }
  return code;
}

function normalizeWordStyle(value: unknown): WordStyle | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "classic") return "classic";
  if (raw === "chaos") return "chaos";
  if (raw === "naughty") return "naughty";
  return null;
}

function groupMatchesStyle(
  groupStyle: unknown,
  target: WordStyle,
  groupId: string,
  groupName: string
): boolean {
  const normalized = normalizeWordStyle(groupStyle);
  if (normalized) return normalized === target;
  if (target !== "classic") return false;

  // Keep native back-compat behavior for unlabeled classic groups.
  const normalizedId = groupId.trim().toLowerCase();
  const normalizedName = groupName.trim().toLowerCase();
  return normalizedId.startsWith("classic") || normalizedName.includes("classic");
}

export async function resolveDefaultClassicWordGroupId(db: Firestore): Promise<string | null> {
  const now = Date.now();
  if (cachedDefaultClassicWordGroup && cachedDefaultClassicWordGroup.expiresAt > now) {
    return cachedDefaultClassicWordGroup.value;
  }

  if (!inFlightDefaultClassicWordGroupLookup) {
    inFlightDefaultClassicWordGroupLookup = db
      .collection("wordGroups")
      .get()
      .then((snapshot) => {
        const candidates = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, data: (docSnap.data() ?? {}) as WordGroupDoc }))
          .filter((entry) => entry.data.enabled !== false)
          .filter((entry) =>
            groupMatchesStyle(
              entry.data.style,
              "classic",
              entry.id,
              typeof entry.data.name === "string" ? entry.data.name : ""
            )
          )
          .sort((a, b) => a.id.localeCompare(b.id));

        const value = candidates[0]?.id ?? null;
        cachedDefaultClassicWordGroup = {
          value,
          expiresAt: Date.now() + DEFAULT_CLASSIC_WORD_GROUP_TTL_MS,
        };
        return value;
      })
      .finally(() => {
        inFlightDefaultClassicWordGroupLookup = null;
      });
  }

  return inFlightDefaultClassicWordGroupLookup;
}

export function buildInitialGameDoc(input: {
  gameCode: string;
  hostPlayerId: string;
  createdAt: FirebaseFirestore.FieldValue;
  wordGroupId: string | null;
  lastActionAt: number;
  classicMaxHuntersPerVictim?: number;
  classicPointsToWin?: number;
}): CreateGameDoc {
  return {
    gameCode: input.gameCode,
    hostPlayerId: input.hostPlayerId,
    version: 1,
    started: false,
    ended: false,
    winnerPlayerId: null,
    startedAt: null,
    endedAt: null,
    createdAt: input.createdAt,
    startedBy: null,
    aliveCount: 1,
    assignmentsCommitted: false,
    wordGroupId: input.wordGroupId,
    wordStyle: "classic",
    wordGroupLocked: false,
    lastActionAt: input.lastActionAt,
    mode: "classic",
    classicMaxHuntersPerVictim: input.classicMaxHuntersPerVictim ?? 2,
    classicPointsToWin: input.classicPointsToWin ?? 10,
    classicEndAt: null,
    lobbyCountdownEndsAt: null,
    lobbyCountdownStartedBy: null,
    lobbyCountdownPausedRemainingMs: null,
    paused: false,
    pausedAt: null,
    pausedBy: null,
  };
}
