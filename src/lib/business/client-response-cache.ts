type CacheEnvelope<T> = {
  createdAtMs: number;
  data: T;
};

const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const STORAGE_PREFIX = "biz.response.cache.";

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function readClientCache<T>(key: string, maxAgeMs: number): T | null {
  const now = Date.now();
  const fromMemory = memoryCache.get(key) as CacheEnvelope<T> | undefined;
  if (fromMemory && now - fromMemory.createdAtMs <= maxAgeMs) {
    return fromMemory.data;
  }

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.createdAtMs !== "number") return null;
    if (now - parsed.createdAtMs > maxAgeMs) {
      window.sessionStorage.removeItem(storageKey(key));
      return null;
    }
    memoryCache.set(key, parsed as CacheEnvelope<unknown>);
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeClientCache<T>(key: string, data: T): void {
  const envelope: CacheEnvelope<T> = {
    createdAtMs: Date.now(),
    data,
  };
  memoryCache.set(key, envelope as CacheEnvelope<unknown>);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(envelope));
  } catch {
    // best-effort cache
  }
}

export function clearClientCacheByPrefix(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  if (typeof window === "undefined") return;
  try {
    const fullPrefix = storageKey(prefix);
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (!key) continue;
      if (key.startsWith(fullPrefix)) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // best-effort cache clear
  }
}
