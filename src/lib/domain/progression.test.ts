import { describe, expect, it } from "vitest";

import {
  calculateForestHealthScore,
  growthStageFromTotalExp,
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
});
