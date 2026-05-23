export type SessionMode =
  | "quick_recall"
  | "focused_quiz"
  | "mixed_revision"
  | "pre_exam_burst"
  | "timed_challenge";

export interface SessionModeConfig {
  durationMinutes: number;
  adaptiveIntensity: "low" | "medium" | "high";
  competitive: boolean;
}

export const SESSION_MODE_CONFIG: Record<SessionMode, SessionModeConfig> = {
  quick_recall: {
    durationMinutes: 3,
    adaptiveIntensity: "medium",
    competitive: false,
  },
  focused_quiz: {
    durationMinutes: 8,
    adaptiveIntensity: "high",
    competitive: false,
  },
  mixed_revision: {
    durationMinutes: 10,
    adaptiveIntensity: "medium",
    competitive: false,
  },
  pre_exam_burst: {
    durationMinutes: 5,
    adaptiveIntensity: "high",
    competitive: false,
  },
  timed_challenge: {
    durationMinutes: 4,
    adaptiveIntensity: "medium",
    competitive: true,
  },
};

export function recommendSessionMode(
  availableMinutes: number,
  preExamFocus: boolean,
): SessionMode {
  if (preExamFocus) {
    return "pre_exam_burst";
  }

  if (availableMinutes <= 4) {
    return "quick_recall";
  }

  if (availableMinutes <= 8) {
    return "focused_quiz";
  }

  return "mixed_revision";
}
