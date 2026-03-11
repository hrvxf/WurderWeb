import { AUTH_ROUTES, getPostAuthRoute, requiresCompletedProfile, toNextPath } from "@/lib/auth/route-helpers";

describe("route auth helpers", () => {
  it("routes incomplete profiles to members profile page", () => {
    expect(
      getPostAuthRoute({
        uid: "u1",
        email: "user@example.com",
        name: "Alex Mason",
      })
    ).toBe(AUTH_ROUTES.membersProfile);
  });

  it("routes complete profiles to members dashboard", () => {
    expect(
      getPostAuthRoute({
        uid: "u1",
        email: "user@example.com",
        wurderId: "alex_1",
        firstName: "Alex",
        lastName: "Mason",
      })
    ).toBe(AUTH_ROUTES.members);
  });

  it("requires completion for members routes except profile page", () => {
    expect(requiresCompletedProfile("/members")).toBe(true);
    expect(requiresCompletedProfile("/members/stats")).toBe(true);
    expect(requiresCompletedProfile("/members/profile")).toBe(false);
    expect(requiresCompletedProfile("/join")).toBe(false);
  });

  it("sanitizes invalid next path values", () => {
    expect(toNextPath("members")).toBe(AUTH_ROUTES.members);
    expect(toNextPath("/members/stats")).toBe("/members/stats");
  });
});

