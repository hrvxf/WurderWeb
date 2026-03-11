import { browserLocalPersistence, setPersistence } from "firebase/auth";

import { auth } from "@/lib/firebase";

let persistencePromise: Promise<void> | null = null;

const CACHE_PREFIXES = [
  "wurder:member",
  "wurder:game",
  "member:",
  "game:",
  "wurder-member",
  "wurder-game",
];

const CACHE_KEYS = [
  "wurder_member_profile",
  "wurder_member_stats",
  "wurder_active_game",
  "wurder_game_history",
];

export async function setupBrowserLocalPersistence(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
      persistencePromise = null;
      throw error;
    });
  }
  await persistencePromise;
}

export function clearMemberCaches(): void {
  if (typeof window === "undefined") return;

  for (const key of CACHE_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    if (CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key);
    }
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (!key) continue;
    if (CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.sessionStorage.removeItem(key);
    }
  }
}
