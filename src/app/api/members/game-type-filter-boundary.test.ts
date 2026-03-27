import { describe, expect, it } from "vitest";

import { parseMemberGameTypeFilter } from "@/lib/game/game-type-filter";

describe("member API gameType boundaries", () => {
  it("defaults personal stats trends to b2c", () => {
    expect(parseMemberGameTypeFilter(null)).toBe("b2c");
    expect(parseMemberGameTypeFilter("")).toBe("b2c");
    expect(parseMemberGameTypeFilter("unknown")).toBe("b2c");
  });

  it("defaults personal sessions list to b2c", () => {
    expect(parseMemberGameTypeFilter(null)).toBe("b2c");
    expect(parseMemberGameTypeFilter("")).toBe("b2c");
    expect(parseMemberGameTypeFilter("unknown")).toBe("b2c");
  });

  it("accepts explicit all and b2b filters", () => {
    expect(parseMemberGameTypeFilter("all")).toBe("all");
    expect(parseMemberGameTypeFilter("b2b")).toBe("b2b");
    expect(parseMemberGameTypeFilter("business")).toBe("b2b");
  });
});
