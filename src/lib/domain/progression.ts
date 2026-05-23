import { forestThemeTokens } from "@/lib/design/tokens";
const CONSISTENCY_WEIGHT = 0.65;
const MASTERY_WEIGHT = 0.35;
const GROWTH_STAGE_EXP_STEP = 650;
const MAX_GROWTH_STAGE = 12;

export interface ExpAwardInput {
  streakDays: number;
  accuracy: number;
  masteryDelta: number;
  sessionLengthMinutes: number;
}

export interface ExpAwardBreakdown {
  baseExp: number;
  consistencyBonus: number;
  masteryBonus: number;
  totalExp: number;
}
export interface ForestHealthInput {
  previousHealthScore: number;
  expDelta: number;
  consistencyDelta: number;
  masteryDelta: number;
  streakDelta: number;
  sessionsCompletedDelta: number;
  minutesStudiedDelta: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateExpAward(input: ExpAwardInput): ExpAwardBreakdown {
  const baseExp = Math.max(10, Math.round(input.sessionLengthMinutes * 8));
  const consistencyBonus = Math.round(
    baseExp * CONSISTENCY_WEIGHT * Math.min(input.streakDays / 30, 1),
  );
  const masterySignal = Math.max(0, Math.min(1, input.accuracy + input.masteryDelta));
  const masteryBonus = Math.round(baseExp * MASTERY_WEIGHT * masterySignal);
  const totalExp = baseExp + consistencyBonus + masteryBonus;

  return {
    baseExp,
    consistencyBonus,
    masteryBonus,
    totalExp,
  };
}

export function growthStageFromTotalExp(totalExp: number): number {
  return clamp(
    Math.floor(Math.max(0, totalExp) / GROWTH_STAGE_EXP_STEP) + 1,
    1,
    MAX_GROWTH_STAGE,
  );
}

export function resolveUnlockedBiomesForTotalExp(totalExp: number): string[] {
  return forestThemeTokens.biomeLadder
    .filter((biome) => totalExp >= biome.expThreshold)
    .map((biome) => biome.key);
}

export function resolveCurrentBiomeForTotalExp(totalExp: number): string {
  const unlockedBiomes = resolveUnlockedBiomesForTotalExp(totalExp);

  return (
    unlockedBiomes[unlockedBiomes.length - 1] ??
    forestThemeTokens.biomeLadder[0]?.key ??
    "seedling_meadow"
  );
}

export function calculateForestHealthScore(input: ForestHealthInput): number {
  const learningMomentumPulse =
    input.sessionsCompletedDelta * 1.8 + input.minutesStudiedDelta * 0.08;
  const consistencyPulse = input.consistencyDelta * 0.6;
  const masteryPulse = input.masteryDelta * 20;
  const streakPulse =
    Math.max(0, input.streakDelta) * 2.2 - Math.max(0, -input.streakDelta) * 3;
  const expPenalty = input.expDelta < 0 ? Math.min(15, Math.abs(input.expDelta) / 40) : 0;

  return clamp(
    input.previousHealthScore +
      learningMomentumPulse +
      consistencyPulse +
      masteryPulse +
      streakPulse -
      expPenalty,
    0,
    100,
  );
}
export function shouldDropMysterySeed(
  streakDays: number,
  randomValue = Math.random(),
): boolean {
  const boundedChance = Math.min(0.3, 0.04 + streakDays * 0.006);
  return randomValue < boundedChance;
}
