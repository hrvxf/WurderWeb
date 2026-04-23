import { buildGameTypeOpenPlayLink, isGameType } from "@/domain/handoff/gameTypeLink";

describe("gameTypeLink helpers", () => {
  it("builds the b2c open-play payload", () => {
    expect(buildGameTypeOpenPlayLink("b2c")).toBe("wurder://?gameType=b2c&openPlay=1&skipResume=1");
  });

  it("builds the b2b open-play payload", () => {
    expect(buildGameTypeOpenPlayLink("b2b")).toBe("wurder://?gameType=b2b&openPlay=1&skipResume=1");
  });

  it("validates canonical game types", () => {
    expect(isGameType("b2c")).toBe(true);
    expect(isGameType("b2b")).toBe(true);
    expect(isGameType("B2C")).toBe(false);
    expect(isGameType("mode")).toBe(false);
  });
});
