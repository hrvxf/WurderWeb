import { buildAppJoinLink, buildJoinUniversalLink, buildUniversalJoinLink } from "@/domain/join/links";

describe("join links", () => {
  it("builds universal link", () => {
    expect(buildUniversalJoinLink("ABC123")).toBe("https://wurder.app/join/ABC123");
    expect(buildJoinUniversalLink("ABC123")).toBe("https://wurder.app/join/ABC123");
  });

  it("builds app deep link", () => {
    expect(buildAppJoinLink("ABC123")).toBe("wurder://join/ABC123");
  });
});
