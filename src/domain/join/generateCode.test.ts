import { generateJoinCode } from "@/domain/join/generateCode";
import { GAME_CODE_PATTERN } from "@/domain/join/code";

describe("generateJoinCode", () => {
  it("generates 6-character uppercase alphanumeric code", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(6);
    expect(GAME_CODE_PATTERN.test(code)).toBe(true);
  });

  it("supports custom code length between 6 and 8", () => {
    const code = generateJoinCode(8);
    expect(code).toHaveLength(8);
    expect(/^[A-Z0-9]{8}$/.test(code)).toBe(true);
  });

  it("throws for invalid length", () => {
    expect(() => generateJoinCode(5)).toThrow();
    expect(() => generateJoinCode(9)).toThrow();
  });
});
