vi.mock("@/lib/firebase", () => ({
  auth: { __auth: true },
}));

import { clearMemberCaches } from "@/lib/auth/session";

class MemoryStorage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

describe("clearMemberCaches", () => {
  it("removes member/game cache keys from both storage scopes", () => {
    const localStorage = new MemoryStorage();
    const sessionStorage = new MemoryStorage();

    localStorage.setItem("wurder_member_profile", "1");
    localStorage.setItem("wurder:member:dashboard", "1");
    localStorage.setItem("wurder-game:active", "1");
    localStorage.setItem("unrelated", "keep");

    sessionStorage.setItem("wurder_member_stats", "1");
    sessionStorage.setItem("game:123", "1");
    sessionStorage.setItem("safe-key", "keep");

    Object.assign(globalThis, {
      window: {
        localStorage,
        sessionStorage,
      },
    });

    clearMemberCaches();

    expect(localStorage.getItem("wurder_member_profile")).toBeNull();
    expect(localStorage.getItem("wurder:member:dashboard")).toBeNull();
    expect(localStorage.getItem("wurder-game:active")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");

    expect(sessionStorage.getItem("wurder_member_stats")).toBeNull();
    expect(sessionStorage.getItem("game:123")).toBeNull();
    expect(sessionStorage.getItem("safe-key")).toBe("keep");
  });
});
