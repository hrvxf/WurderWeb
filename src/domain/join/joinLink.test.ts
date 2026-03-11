import { buildJoinUniversalLink, extractGameCodeFromPayload } from "@/domain/join/joinLink";

describe("joinLink helpers", () => {
  it("builds canonical universal join URL", () => {
    expect(buildJoinUniversalLink("ABC123")).toBe("https://wurder.app/join/ABC123");
  });

  it("rejects invalid game code when building universal URL", () => {
    expect(buildJoinUniversalLink("AB-123")).toBe("");
  });

  it("extracts game code from raw payload", () => {
    expect(extractGameCodeFromPayload("abc123")).toBe("ABC123");
  });

  it("extracts game code from full URL payload", () => {
    expect(extractGameCodeFromPayload("https://wurder.app/join/ab-c123?x=1")).toBe("ABC123");
  });

  it("extracts game code from path payload", () => {
    expect(extractGameCodeFromPayload("/join/ab_c123")).toBe("ABC123");
  });

  it("returns empty string for invalid payload", () => {
    expect(extractGameCodeFromPayload("hello world")).toBe("");
  });
});
