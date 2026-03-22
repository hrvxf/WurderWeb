import {
  isValidEmail,
  isValidWurderId,
  normalizeEmail,
  normalizePersonName,
  normalizeWurderId,
} from "@/lib/auth/auth-helpers";

describe("auth helper normalization", () => {
  it("normalizes emails and wurder IDs with trim + lowercase", () => {
    expect(normalizeEmail("  USER@Example.com ")).toBe("user@example.com");
    expect(normalizeWurderId("  Player_One ")).toBe("player_one");
  });

  it("accepts valid wurder IDs", () => {
    expect(isValidWurderId("abc")).toBe(true);
    expect(isValidWurderId("ABC_123")).toBe(true);
  });

  it("validates email format", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail(" user@example.com ")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("foo@bar")).toBe(false);
  });

  it("rejects invalid wurder IDs", () => {
    expect(isValidWurderId("ab")).toBe(false);
    expect(isValidWurderId("user name")).toBe(false);
    expect(isValidWurderId("bad-id")).toBe(false);
    expect(isValidWurderId("!oops")).toBe(false);
  });

  it("normalizes person names into forced capitalization", () => {
    expect(normalizePersonName("  aLiCe   o'connor-smith ")).toBe("Alice O'Connor-Smith");
  });
});
