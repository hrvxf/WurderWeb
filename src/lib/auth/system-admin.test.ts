import { isSystemAdmin, parseSystemAdminUidAllowlist } from "@/lib/auth/system-admin-policy";

describe("system admin authorization", () => {
  it("parses UID allowlist entries", () => {
    expect(parseSystemAdminUidAllowlist(" uid-one,uid-two ,, ")).toEqual(new Set(["uid-one", "uid-two"]));
  });

  it("authorizes system admin via UID allowlist", () => {
    expect(
      isSystemAdmin(
        {
          uid: "uid-123",
          email: "someone@example.com",
          email_verified: false,
        },
        "uid-123"
      )
    ).toBe(true);
  });

  it("authorizes bridge system admin via verified email", () => {
    expect(
      isSystemAdmin(
        {
          uid: "different-uid",
          email: "HELLO@WURDER.CO.UK",
          email_verified: true,
        },
        ""
      )
    ).toBe(true);
  });

  it("rejects unverified bridge email", () => {
    expect(
      isSystemAdmin(
        {
          uid: "different-uid",
          email: "hello@wurder.co.uk",
          email_verified: false,
        },
        ""
      )
    ).toBe(false);
  });
});
