import { describe, expect, it } from "vitest";

import {
  applyModeSelection,
  buildStartSessionSetupPayload,
  shouldShowFreeForAllVariant,
  shouldShowGuildWinCondition,
} from "@/app/start-session/state";

describe("start-session mode state", () => {
  it("shows guild controls and defaults guild win condition to score", () => {
    const next = applyModeSelection(
      {
        selectedMode: "classic",
        selectedFreeForAllVariant: null,
        selectedGuildWinCondition: null,
      },
      "guilds"
    );

    expect(shouldShowGuildWinCondition(next.selectedMode)).toBe(true);
    expect(shouldShowFreeForAllVariant(next.selectedMode)).toBe(false);
    expect(next.selectedGuildWinCondition).toBe("score");
  });

  it("shows ffa controls and defaults ffa variant to classic", () => {
    const next = applyModeSelection(
      {
        selectedMode: "classic",
        selectedFreeForAllVariant: null,
        selectedGuildWinCondition: null,
      },
      "free_for_all"
    );

    expect(shouldShowFreeForAllVariant(next.selectedMode)).toBe(true);
    expect(shouldShowGuildWinCondition(next.selectedMode)).toBe(false);
    expect(next.selectedFreeForAllVariant).toBe("classic");
  });

  it("clears stale guild state when switching guilds to free_for_all", () => {
    const next = applyModeSelection(
      {
        selectedMode: "guilds",
        selectedFreeForAllVariant: null,
        selectedGuildWinCondition: "last_standing",
      },
      "free_for_all"
    );

    expect(next.selectedGuildWinCondition).toBeNull();
    const payload = buildStartSessionSetupPayload({
      gameType: "b2c",
      selectedMode: next.selectedMode,
      selectedFreeForAllVariant: next.selectedFreeForAllVariant,
      selectedGuildWinCondition: next.selectedGuildWinCondition,
    });
    expect(payload).toEqual({
      gameType: "b2c",
      mode: "free_for_all",
      freeForAllVariant: "classic",
    });
    expect(payload).not.toHaveProperty("guildWinCondition");
  });

  it("clears stale ffa state when switching free_for_all to guilds", () => {
    const next = applyModeSelection(
      {
        selectedMode: "free_for_all",
        selectedFreeForAllVariant: "survivor",
        selectedGuildWinCondition: null,
      },
      "guilds"
    );

    expect(next.selectedFreeForAllVariant).toBeNull();
    const payload = buildStartSessionSetupPayload({
      gameType: "b2c",
      selectedMode: next.selectedMode,
      selectedFreeForAllVariant: next.selectedFreeForAllVariant,
      selectedGuildWinCondition: next.selectedGuildWinCondition,
    });
    expect(payload).toEqual({
      gameType: "b2c",
      mode: "guilds",
      guildWinCondition: "score",
    });
    expect(payload).not.toHaveProperty("freeForAllVariant");
  });

  it("clears both secondary selections on non-branching mode", () => {
    const fromGuilds = applyModeSelection(
      {
        selectedMode: "guilds",
        selectedFreeForAllVariant: null,
        selectedGuildWinCondition: "last_standing",
      },
      "classic"
    );
    expect(fromGuilds.selectedGuildWinCondition).toBeNull();
    expect(fromGuilds.selectedFreeForAllVariant).toBeNull();
    expect(shouldShowGuildWinCondition(fromGuilds.selectedMode)).toBe(false);
    expect(shouldShowFreeForAllVariant(fromGuilds.selectedMode)).toBe(false);

    const payload = buildStartSessionSetupPayload({
      gameType: "b2c",
      selectedMode: fromGuilds.selectedMode,
      selectedFreeForAllVariant: fromGuilds.selectedFreeForAllVariant,
      selectedGuildWinCondition: fromGuilds.selectedGuildWinCondition,
    });
    expect(payload).toEqual({
      gameType: "b2c",
      mode: "classic",
    });
    expect(payload).not.toHaveProperty("freeForAllVariant");
    expect(payload).not.toHaveProperty("guildWinCondition");
  });
});
