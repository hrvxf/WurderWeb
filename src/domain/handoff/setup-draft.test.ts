import {
  buildSetupDeepLink,
  buildSetupUniversalLink,
  createHandoffSetupDraftDoc,
  isSetupExpired,
  normalizeSetupId,
  parseHandoffSetupConfig,
  parseHandoffSetupDraftDoc,
} from "@/domain/handoff/setup-draft";

describe("setup-draft helpers", () => {
  it("parses canonical setup config only", () => {
    expect(parseHandoffSetupConfig({ gameType: "b2c", mode: "classic" })).toEqual({
      gameType: "b2c",
      mode: "classic",
    });
    expect(parseHandoffSetupConfig({ gameType: "B2C", mode: "classic" })).toEqual({
      gameType: "b2c",
      mode: "classic",
    });
    expect(parseHandoffSetupConfig({ gameType: "b2c", mode: "ring" })).toEqual({
      gameType: "b2c",
      mode: "elimination",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "free_for_all",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "free_for_all",
        freeForAllVariant: "survivor",
      })
    ).toEqual({
      gameType: "b2c",
      mode: "free_for_all",
      freeForAllVariant: "survivor",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "classic",
        freeForAllVariant: "survivor",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "classic",
        freeForAllVariant: "classic",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "free_for_all",
        freeForAllVariant: "invalid",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "free_for_all",
        freeForAllVariant: "SURVIVOR",
      })
    ).toEqual({
      gameType: "b2c",
      mode: "free_for_all",
      freeForAllVariant: "survivor",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "guilds",
      })
    ).toEqual({
      gameType: "b2c",
      mode: "guilds",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "guilds",
        guildWinCondition: "score",
      })
    ).toEqual({
      gameType: "b2c",
      mode: "guilds",
      guildWinCondition: "score",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "guilds",
        guildWinCondition: "last_standing",
      })
    ).toEqual({
      gameType: "b2c",
      mode: "guilds",
      guildWinCondition: "last_standing",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "classic",
        guildWinCondition: "score",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "guilds",
        guildWinCondition: "invalid",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2c",
        mode: "free_for_all",
        guildWinCondition: "score",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2b",
        mode: "classic",
        orgId: "org-1",
        sessionType: "player",
      })
    ).toEqual({
      gameType: "b2b",
      mode: "classic",
      orgId: "org-1",
      sessionType: "player",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2b",
        mode: "free_for_all",
        orgId: "org-1",
        sessionType: "player",
      })
    ).toBeNull();
    expect(
      parseHandoffSetupConfig({
        gameType: "b2b",
        mode: "free_for_all",
        freeForAllVariant: "survivor",
        orgId: "org-1",
        sessionType: "player",
      })
    ).toEqual({
      gameType: "b2b",
      mode: "free_for_all",
      freeForAllVariant: "survivor",
      orgId: "org-1",
      sessionType: "player",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2b",
        mode: "guilds",
        guildWinCondition: "last_standing",
        orgId: "org-1",
        sessionType: "player",
      })
    ).toEqual({
      gameType: "b2b",
      mode: "guilds",
      guildWinCondition: "last_standing",
      orgId: "org-1",
      sessionType: "player",
    });
    expect(
      parseHandoffSetupConfig({
        gameType: "b2b",
        mode: "classic",
        guildWinCondition: "score",
        orgId: "org-1",
        sessionType: "player",
      })
    ).toBeNull();
  });

  it("normalizes valid setup id", () => {
    expect(normalizeSetupId("abcd234efg")).toBe("ABCD234EFG");
    expect(normalizeSetupId("bad-id")).toBeNull();
  });

  it("creates and parses setup draft docs", () => {
    const nowMs = 10_000;
    const created = createHandoffSetupDraftDoc({
      config: { gameType: "b2b", mode: "guilds", orgId: "org-1", sessionType: "host_only" },
      createdByAccountId: "uid_123",
      nowMs,
    });

    const parsed = parseHandoffSetupDraftDoc(created);
    expect(parsed).toEqual(created);
    expect(isSetupExpired(created.expiresAtMs, nowMs)).toBe(false);
    expect(isSetupExpired(created.expiresAtMs, created.expiresAtMs)).toBe(true);
  });

  it("builds setup handoff links", () => {
    expect(buildSetupDeepLink("ABCD234EFG")).toBe("wurder://?setupId=ABCD234EFG&openPlay=1&skipResume=1");
    expect(buildSetupUniversalLink("ABCD234EFG")).toBe("https://wurder.app/start/ABCD234EFG");
  });
});
