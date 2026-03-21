import { getProfileCompletionStatus, isProfileComplete } from "@/lib/auth/profile-completion";

describe("isProfileComplete", () => {
  it("requires a wurderId", () => {
    expect(
      isProfileComplete({
        uid: "u1",
        email: "user@example.com",
        name: "Alex Mason",
      })
    ).toBe(false);
  });

  it("accepts display-name based profiles", () => {
    expect(
      isProfileComplete({
        uid: "u1",
        email: "user@example.com",
        wurderId: "Alex_1",
        name: "Alex Mason",
      })
    ).toBe(true);
  });

  it("accepts first+last-name based profiles", () => {
    expect(
      isProfileComplete({
        uid: "u1",
        email: "user@example.com",
        wurderId: "Alex_1",
        firstName: "Alex",
        lastName: "Mason",
      })
    ).toBe(true);
  });

  it("does not require avatar or stats", () => {
    expect(
      isProfileComplete({
        uid: "u1",
        email: "user@example.com",
        wurderId: "Alex_1",
        name: "Alex Mason",
        avatar: null,
      })
    ).toBe(true);
  });

  it("treats whitespace-only values as missing", () => {
    expect(
      isProfileComplete({
        uid: "u1",
        email: "user@example.com",
        wurderId: "   ",
        firstName: " Alex ",
        lastName: " Mason ",
      })
    ).toBe(false);
  });

  it("reports precise missing fields from resolved profile", () => {
    const status = getProfileCompletionStatus({
      uid: "u1",
      email: "user@example.com",
      firstName: "Alex",
      name: "",
    });

    expect(status).toEqual({
      complete: false,
      missingFields: ["wurderId", "lastName"],
    });
  });
});
