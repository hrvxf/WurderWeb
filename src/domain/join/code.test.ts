import { parseGameCode } from "@/domain/join/code";

describe("parseGameCode", () => {
  it("accepts valid uppercase game code", () => {
    expect(parseGameCode("ABC123")).toEqual({ value: "ABC123", isValid: true });
  });

  it("normalizes lowercase and strips punctuation", () => {
    expect(parseGameCode("ab-c12_3")).toEqual({ value: "ABC123", isValid: true });
  });

  it("rejects invalid length", () => {
    expect(parseGameCode("ABCDE").isValid).toBe(false);
  });

  it("does not throw on malformed URL encoding", () => {
    expect(parseGameCode("%E0%A4%A").isValid).toBe(false);
  });
});
