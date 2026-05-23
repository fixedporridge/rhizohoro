const CONSISTENCY_WEIGHT = 0.65;
const MASTERY_WEIGHT = 0.35;

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

export function shouldDropMysterySeed(
  streakDays: number,
  randomValue = Math.random(),
): boolean {
  const boundedChance = Math.min(0.3, 0.04 + streakDays * 0.006);
  return randomValue < boundedChance;
}
