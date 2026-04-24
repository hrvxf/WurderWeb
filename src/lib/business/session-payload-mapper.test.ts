import { describe, expect, it } from "vitest";

import { buildCreateBusinessSessionPayload } from "@/lib/business/session-payload-mapper";
import type { SetupState } from "@/lib/business/session-options";

const baseSetup: SetupState = {
  orgName: "Acme",
  orgId: "org_1",
  sessionLabel: "Ops training",
  gameMode: "classic",
  freeForAllVariant: "classic",
  guildWinCondition: "score",
  length: 60,
  managerParticipation: "host_only",
};

describe("buildCreateBusinessSessionPayload", () => {
  it("builds FFA classic payload", () => {
    const payload = buildCreateBusinessSessionPayload({
      ...baseSetup,
      gameMode: "free_for_all",
      freeForAllVariant: "classic",
    });

    expect(payload.mode).toBe("free_for_all");
    expect(payload.freeForAllVariant).toBe("classic");
    expect(payload.guildWinCondition).toBeUndefined();
  });

  it("builds FFA survivor payload", () => {
    const payload = buildCreateBusinessSessionPayload({
      ...baseSetup,
      gameMode: "free_for_all",
      freeForAllVariant: "survivor",
    });

    expect(payload.mode).toBe("free_for_all");
    expect(payload.freeForAllVariant).toBe("survivor");
    expect(payload.guildWinCondition).toBeUndefined();
  });

  it("builds guilds score payload", () => {
    const payload = buildCreateBusinessSessionPayload({
      ...baseSetup,
      gameMode: "guilds",
      guildWinCondition: "score",
    });

    expect(payload.mode).toBe("guilds");
    expect(payload.guildWinCondition).toBe("score");
    expect(payload.freeForAllVariant).toBeUndefined();
  });

  it("builds guilds last_standing payload", () => {
    const payload = buildCreateBusinessSessionPayload({
      ...baseSetup,
      gameMode: "guilds",
      guildWinCondition: "last_standing",
    });

    expect(payload.mode).toBe("guilds");
    expect(payload.guildWinCondition).toBe("last_standing");
    expect(payload.freeForAllVariant).toBeUndefined();
  });

  it("removes stale mode-specific fields when switching away", () => {
    const fromFfa = buildCreateBusinessSessionPayload({
      ...baseSetup,
      gameMode: "classic",
      freeForAllVariant: "survivor",
      guildWinCondition: "last_standing",
    });
    expect(fromFfa.freeForAllVariant).toBeUndefined();
    expect(fromFfa.guildWinCondition).toBeUndefined();

    const fromGuilds = buildCreateBusinessSessionPayload({
      ...baseSetup,
      gameMode: "elimination_multi",
      freeForAllVariant: "classic",
      guildWinCondition: "score",
    });
    expect(fromGuilds.freeForAllVariant).toBeUndefined();
    expect(fromGuilds.guildWinCondition).toBeUndefined();
  });
});
