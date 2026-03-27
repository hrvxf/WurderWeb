import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";

import { getCurrentUser, CurrentUserInfrastructureError, CurrentUserUnauthenticatedError } from "@/lib/auth/getCurrentUser";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeSessionGameType, type SessionGameType } from "@/lib/game/session-type";
import { parseMemberGameTypeFilter, type SessionGameTypeFilter } from "@/lib/game/game-type-filter";

export const runtime = "nodejs";

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

type SessionRow = {
  gameCode: string;
  sessionName: string;
  gameType: SessionGameType | null;
  orgId: string | null;
  createdAt: string | null;
  endedAt: string | null;
  recencyMs: number;
};

type CursorPayload = {
  v: 2;
  offset: number;
};

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 200;

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

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function decodeCursor(value: string | null): CursorPayload | null {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<CursorPayload>;
    if (parsed?.v === 2 && typeof parsed?.offset === "number" && Number.isFinite(parsed.offset)) {
      return {
        v: 2,
        offset: Math.max(0, Math.floor(parsed.offset)),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function encodeCursor(input: CursorPayload): string {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
}

export async function GET(request: Request) {
  try {
    const { uid } = await getCurrentUser(request.headers.get("authorization"));
    const { searchParams } = new URL(request.url);
    const gameTypeFilter: SessionGameTypeFilter = parseMemberGameTypeFilter(searchParams.get("gameType"));
    const limit = parseLimit(searchParams.get("limit"));
    const cursor = decodeCursor(searchParams.get("cursor"));
    const offset = cursor?.offset ?? 0;
    const fetchLimit = Math.min(Math.max(offset + limit + 120, 120), 5000);

    const [userGamesSnap, createdGamesSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).collection("games").limit(fetchLimit).get(),
      adminDb.collection("games").where("createdByAccountId", "==", uid).limit(fetchLimit).get(),
    ]);

    const sessionMap = new Map<string, SessionRow>();

    for (const doc of userGamesSnap.docs) {
      const data = (doc.data() ?? {}) as UserGameDoc;
      const gameCode = asNonEmptyString(data.gameCode) ?? asNonEmptyString(data.gameId) ?? asNonEmptyString(doc.id);
      if (!gameCode) continue;

      const createdAt = timestampToIso(data.createdAt) ?? timestampToIso(data.joinedAt);
      const endedAt = timestampToIso(data.endedAt) ?? timestampToIso(data.leftAt);
      const row: SessionRow = {
        gameCode,
        sessionName: asNonEmptyString(data.sessionName) ?? asNonEmptyString(data.gameName) ?? gameCode,
        gameType: normalizeSessionGameType(data.gameType),
        orgId: asNonEmptyString(data.orgId),
        createdAt,
        endedAt,
        recencyMs: toRecencyMs(createdAt, endedAt),
      };
      sessionMap.set(gameCode, row);
    }

    for (const doc of createdGamesSnap.docs) {
      const gameCode = asNonEmptyString(doc.id);
      if (!gameCode) continue;
      const game = (doc.data() ?? {}) as GameDoc;
      const createdAt = timestampToIso(game.createdAt);
      const endedAt = timestampToIso(game.endedAt);
      const gameType = normalizeSessionGameType(game.gameType);
      const orgId = asNonEmptyString(game.orgId);
      const recencyMs = toRecencyMs(createdAt, endedAt);

      const existing = sessionMap.get(gameCode);
      if (!existing) {
        sessionMap.set(gameCode, {
          gameCode,
          sessionName: gameCode,
          gameType,
          orgId,
          createdAt,
          endedAt,
          recencyMs,
        });
        continue;
      }

      sessionMap.set(gameCode, {
        ...existing,
        gameType: existing.gameType ?? gameType,
        orgId: existing.orgId ?? orgId,
        createdAt: existing.createdAt ?? createdAt,
        endedAt: existing.endedAt ?? endedAt,
        recencyMs: Math.max(existing.recencyMs, recencyMs),
      });
    }

    const sorted = [...sessionMap.values()].sort((a, b) => {
      if (b.recencyMs !== a.recencyMs) return b.recencyMs - a.recencyMs;
      return b.gameCode.localeCompare(a.gameCode);
    });

    const filtered = sorted.filter((entry) => {
      // Temporary backfill fallback: infer type from orgId when gameType is missing.
      const resolvedGameType = entry.gameType ?? (entry.orgId ? "b2b" : "b2c");
      if (gameTypeFilter === "all") return true;
      return resolvedGameType === gameTypeFilter;
    });

    const paged = filtered.slice(offset, offset + limit);
    const hasMore = filtered.length > offset + limit;
    const nextCursor = hasMore
      ? encodeCursor({
          v: 2,
          offset: offset + paged.length,
        })
      : null;

    const sessions = paged.map((entry) => ({
      gameCode: entry.gameCode,
      sessionName: entry.sessionName,
      // Temporary backfill fallback: infer type from orgId when gameType is missing.
      gameType: entry.gameType ?? (entry.orgId ? "b2b" : "b2c"),
      orgId: entry.orgId,
      createdAt: entry.createdAt,
      endedAt: entry.endedAt,
    }));

    return NextResponse.json({ sessions, limit, hasMore, nextCursor, gameType: gameTypeFilter });
  } catch (error) {
    if (error instanceof CurrentUserUnauthenticatedError) {
      return NextResponse.json({ code: "UNAUTHENTICATED", message: "Sign in before loading previous sessions." }, { status: 401 });
    }
    if (error instanceof CurrentUserInfrastructureError) {
      return NextResponse.json({ code: "AUTH_VERIFICATION_FAILED", message: "Server could not verify Firebase auth." }, { status: 500 });
    }
    console.error("[members:sessions] Failed", error);
    return NextResponse.json({ code: "INTERNAL", message: "Unable to load previous sessions." }, { status: 500 });
  }
}
