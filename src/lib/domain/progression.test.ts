import { describe, expect, it } from "vitest";

import {
  calculateForestHealthScore,
  growthStageFromTotalExp,
  pickBetaShinyBiomeDrop,
  pickMysteryTreeDropForBiome,
  resolveCurrentBiomeForTotalExp,
  resolveUnlockedBiomesForTotalExp,
  shouldDropMysterySeed,
} from "@/lib/domain/progression";

describe("progression domain helpers", () => {
  it("resolves unlocked biomes and current biome from total exp thresholds", () => {
    expect(resolveUnlockedBiomesForTotalExp(0)).toEqual(["seedling_meadow"]);
    expect(resolveUnlockedBiomesForTotalExp(3000)).toEqual([
      "seedling_meadow",
      "canopy_glade",
      "riverlight_basin",
    ]);
    expect(resolveCurrentBiomeForTotalExp(1200)).toBe("canopy_glade");
    expect(resolveCurrentBiomeForTotalExp(5800)).toBe("astral_grove");
  });

  it("maps total exp into bounded forest growth stages", () => {
    expect(growthStageFromTotalExp(0)).toBe(1);
    expect(growthStageFromTotalExp(649)).toBe(1);
    expect(growthStageFromTotalExp(650)).toBe(2);
    expect(growthStageFromTotalExp(50_000)).toBe(12);
  });

  it("computes forest health changes with positive and negative pressure", () => {
    expect(
      calculateForestHealthScore({
        previousHealthScore: 80,
        expDelta: 150,
        consistencyDelta: 4,
        masteryDelta: 0.3,
        streakDelta: 1,
        sessionsCompletedDelta: 1,
        minutesStudiedDelta: 20,
      }),
    ).toBeGreaterThan(80);

    expect(
      calculateForestHealthScore({
        previousHealthScore: 6,
        expDelta: -800,
        consistencyDelta: -10,
        masteryDelta: -0.5,
        streakDelta: -2,
        sessionsCompletedDelta: 0,
        minutesStudiedDelta: 0,
      }),
    ).toBe(0);
  });

  it("keeps mystery-seed RNG chance bounded and deterministic by supplied random values", () => {
    expect(shouldDropMysterySeed(0, 0.03)).toBe(true);
    expect(shouldDropMysterySeed(0, 0.06)).toBe(false);
    expect(shouldDropMysterySeed(100, 0.29)).toBe(true);
    expect(shouldDropMysterySeed(100, 0.31)).toBe(false);
  });

  it("selects mystery tree types using biome-specific weighted drop tables", () => {
    expect(pickMysteryTreeDropForBiome("seedling_meadow", 0.1).treeType).toBe("cedar");
    expect(pickMysteryTreeDropForBiome("seedling_meadow", 0.7).treeType).toBe("oak");
    expect(pickMysteryTreeDropForBiome("seedling_meadow", 0.95).treeType).toBe("pine");
    expect(pickMysteryTreeDropForBiome("canopy_glade", 0.99).treeType).toBe("sakura");
    expect(pickMysteryTreeDropForBiome("riverlight_basin", 0.75).treeType).toBe(
      "maple",
    );
  });

  it("falls back to the default biome drop table when biome key is unknown", () => {
    expect(pickMysteryTreeDropForBiome("unknown_biome", 0.2).treeType).toBe("cedar");
  });

  it("supports a single beta shiny-biome drop at a rare configured rate", () => {
    expect(pickBetaShinyBiomeDrop(0.01)).toMatchObject({
      biomeKey: "astral_grove",
      label: "Shiny Astral Grove",
    });
    expect(pickBetaShinyBiomeDrop(0.99)).toBeNull();
  });
});
