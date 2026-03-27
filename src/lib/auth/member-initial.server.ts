import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

import { resolveCanonicalAccountProfile } from "@/lib/auth/canonical-account-resolver";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeSessionGameType, type SessionGameType } from "@/lib/game/session-type";

export type MemberInitialProfile = {
  email: string | null;
  firstName?: string;
  lastName?: string;
  name?: string;
  wurderId?: string;
  avatar?: string | null;
  avatarUrl?: string | null;
};

export type MemberInitialSession = {
  id: string;
  title: string;
  gameType: SessionGameType | null;
  orgId: string | null;
  createdAt: string | null;
  endedAt: string | null;
  recencyMs: number;
};

type UserGameDoc = {
  gameCode?: unknown;
  gameId?: unknown;
  sessionName?: unknown;
  gameName?: unknown;
  gameType?: unknown;
  orgId?: unknown;
  joinedAt?: unknown;
  createdAt?: unknown;
  endedAt?: unknown;
  leftAt?: unknown;
};

type GameDoc = {
  gameType?: unknown;
  orgId?: unknown;
  createdAt?: unknown;
  endedAt?: unknown;
};

type GameTypeFilter = SessionGameType | "all";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const ts = value as Timestamp;
    const date = ts.toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function toRecencyMs(createdAt: string | null, endedAt: string | null): number {
  const endedMs = endedAt ? Date.parse(endedAt) : 0;
  const createdMs = createdAt ? Date.parse(createdAt) : 0;
  return Math.max(Number.isFinite(endedMs) ? endedMs : 0, Number.isFinite(createdMs) ? createdMs : 0);
}

async function resolveGameTypesForCodes(gameCodes: string[]): Promise<Map<string, SessionGameType>> {
  if (gameCodes.length === 0) return new Map();

  const refs = gameCodes.map((gameCode) => adminDb.collection("games").doc(gameCode));
  const snapshots = await adminDb.getAll(...refs);
  const resolved = new Map<string, SessionGameType>();

  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue;
    const gameType = normalizeSessionGameType((snapshot.data() ?? {}).gameType);
    if (!gameType) continue;
    resolved.set(snapshot.id, gameType);
  }

  return resolved;
}

export async function readInitialMemberProfile(uid: string): Promise<MemberInitialProfile> {
  const [usersSnap, accountsSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("accounts").doc(uid).get(),
  ]);

  const usersData = (usersSnap.data() ?? {}) as Record<string, unknown>;
  const accountsData = (accountsSnap.data() ?? {}) as Record<string, unknown>;
  const canonical = resolveCanonicalAccountProfile(accountsData);

  const email = asNonEmptyString(usersData.email);
  const firstName = canonical.firstName ?? asNonEmptyString(usersData.firstName) ?? undefined;
  const lastName = canonical.lastName ?? asNonEmptyString(usersData.lastName) ?? undefined;
  const name = canonical.name ?? asNonEmptyString(usersData.name) ?? undefined;
  const wurderId = canonical.wurderId ?? asNonEmptyString(usersData.wurderId) ?? undefined;
  const avatarUrl =
    canonical.avatarUrl ??
    asNonEmptyString(usersData.avatarUrl) ??
    asNonEmptyString(usersData.avatar) ??
    null;

  return {
    email,
    firstName,
    lastName,
    name,
    wurderId,
    avatarUrl,
    avatar: avatarUrl,
  };
}

export async function readInitialMemberActiveGameCode(uid: string): Promise<string | null> {
  const usersSnap = await adminDb.collection("users").doc(uid).get();
  const usersData = (usersSnap.data() ?? {}) as Record<string, unknown>;
  const activeGame = usersData.activeGame;

  if (typeof activeGame === "string") {
    const trimmed = activeGame.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!activeGame || typeof activeGame !== "object") return null;

  const row = activeGame as Record<string, unknown>;
  return (
    asNonEmptyString(row.gameCode) ??
    asNonEmptyString(row.gameId) ??
    asNonEmptyString(row.code)
  );
}

export async function readInitialMemberSessions(
  uid: string,
  limit = 8,
  gameTypeFilter: GameTypeFilter = "b2c"
): Promise<MemberInitialSession[]> {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 20);

  const [userGamesSnap, createdGamesSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).collection("games").limit(200).get(),
    adminDb.collection("games").where("createdByAccountId", "==", uid).limit(200).get(),
  ]);

  const sessionMap = new Map<string, MemberInitialSession>();

  for (const doc of userGamesSnap.docs) {
    const data = (doc.data() ?? {}) as UserGameDoc;
    const id = asNonEmptyString(data.gameCode) ?? asNonEmptyString(data.gameId) ?? asNonEmptyString(doc.id);
    if (!id) continue;
    const createdAt = timestampToIso(data.createdAt) ?? timestampToIso(data.joinedAt);
    const endedAt = timestampToIso(data.endedAt) ?? timestampToIso(data.leftAt);
    const row: MemberInitialSession = {
      id,
      title: asNonEmptyString(data.sessionName) ?? asNonEmptyString(data.gameName) ?? id,
      gameType: normalizeSessionGameType(data.gameType),
      orgId: asNonEmptyString(data.orgId),
      createdAt,
      endedAt,
      recencyMs: toRecencyMs(createdAt, endedAt),
    };
    sessionMap.set(id, row);
  }

  for (const doc of createdGamesSnap.docs) {
    const id = asNonEmptyString(doc.id);
    if (!id) continue;
    const game = (doc.data() ?? {}) as GameDoc;
    const createdAt = timestampToIso(game.createdAt);
    const endedAt = timestampToIso(game.endedAt);
    const gameType = normalizeSessionGameType(game.gameType);
    const orgId = asNonEmptyString(game.orgId);
    const recencyMs = toRecencyMs(createdAt, endedAt);
    const existing = sessionMap.get(id);
    if (!existing) {
      sessionMap.set(id, {
        id,
        title: id,
        gameType,
        orgId,
        createdAt,
        endedAt,
        recencyMs,
      });
      continue;
    }
    sessionMap.set(id, {
      ...existing,
      gameType: existing.gameType ?? gameType,
      orgId: existing.orgId ?? orgId,
      createdAt: existing.createdAt ?? createdAt,
      endedAt: existing.endedAt ?? endedAt,
      recencyMs: Math.max(existing.recencyMs, recencyMs),
    });
  }

  const sorted = [...sessionMap.values()]
    .sort((a, b) => {
      if (b.recencyMs !== a.recencyMs) return b.recencyMs - a.recencyMs;
      return b.id.localeCompare(a.id);
    });

  const unresolvedCodes = sorted.filter((entry) => !entry.gameType).map((entry) => entry.id);
  const resolvedTypes = await resolveGameTypesForCodes(unresolvedCodes);

  const withResolvedTypes = sorted.map((entry) => ({
    ...entry,
    // Temporary backfill fallback: infer type from orgId when gameType is missing.
    gameType: entry.gameType ?? resolvedTypes.get(entry.id) ?? (entry.orgId ? "b2b" : "b2c"),
  }));

  const filtered = gameTypeFilter === "all" ? withResolvedTypes : withResolvedTypes.filter((entry) => entry.gameType === gameTypeFilter);
  return filtered.slice(0, safeLimit);
}
