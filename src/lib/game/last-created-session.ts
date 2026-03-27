import type { SessionGameType } from "@/lib/game/session-type";

export const STORAGE_LAST_CREATED_SESSION_KEY = "wurder.lastCreatedSession";

export type LastCreatedSession = {
  gameCode: string;
  gameType: SessionGameType;
  createdAtIso: string;
  joinLink?: string;
  orgId?: string | null;
  orgName?: string | null;
};

export function persistLastCreatedSession(session: LastCreatedSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_LAST_CREATED_SESSION_KEY, JSON.stringify(session));
}
