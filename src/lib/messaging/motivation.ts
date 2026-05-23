const SUCCESS_MESSAGES = [
  "You did it! +40 EXP! Your forest expanded!",
  "Great run! Consistency bonus unlocked!",
  "Lesson complete! Your biome is thriving!",
] as const;

const RECOVERY_MESSAGES = [
  "That one was tricky. Let us do a quick recap.",
  "Close one. You are learning fast, keep going.",
  "You are still growing. One more burst will sharpen this topic.",
] as const;

const STREAK_MESSAGES = [
  "Two minutes now keeps your streak alive.",
  "Quick check-in, big long-term growth.",
  "One session today keeps your biome healthy.",
] as const;

export type MotivationState = "success" | "recovery" | "streak";

function pickByIndex(messages: readonly string[], index: number): string {
  if (messages.length === 0) {
    return "";
  }

  const safeIndex = Math.abs(index) % messages.length;
  return messages[safeIndex];
}

export function selectMotivationMessage(
  state: MotivationState,
  index = 0,
): string {
  if (state === "success") {
    return pickByIndex(SUCCESS_MESSAGES, index);
  }

  if (state === "recovery") {
    return pickByIndex(RECOVERY_MESSAGES, index);
  }

  return pickByIndex(STREAK_MESSAGES, index);
}
