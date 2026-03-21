import { resolveCanonicalAccountProfile } from "@/lib/auth/canonical-account-resolver";
import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";

describe("resolveCanonicalAccountProfile", () => {
  it("maps legacy aliases to canonical fields and completion matches web checks", () => {
    const canonical = resolveCanonicalAccountProfile({
      firstName: "Adam",
      secondName: "James",
      username: "hsajame3",
      photoURL: "https://avatar.test/adam.png",
    });

    expect(canonical).toMatchObject({
      firstName: "Adam",
      lastName: "James",
      wurderId: "hsajame3",
      wurderIdLower: "hsajame3",
      avatarUrl: "https://avatar.test/adam.png",
    });

    expect(
      getProfileCompletionStatus({
        uid: "uid-1",
        email: "adam@example.com",
        ...canonical,
      })
    ).toEqual({ complete: true, missingFields: [] });
  });
});
