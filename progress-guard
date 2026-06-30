const WINDOW_MS = 60 * 1000;

const rateMap = new Map<string, number>();
const idempotencyMap = new Map<string, number>();

const ALLOWED_EXP_SOURCES = new Set([
  "SESSION_COMPLETE",
  "CHALLENGE_REWARD",
  "DAILY_CHECK_IN",
]);

export class ProgressGuard {
  static rateLimit(userId: string): boolean {
    const now = Date.now();
    const last = rateMap.get(userId) ?? 0;

    if (now - last < WINDOW_MS) return false;

    rateMap.set(userId, now);
    return true;
  }

  static isDuplicate(userId: string, sessionId: string | null, reason: string): boolean {
    const key = `${userId}:${sessionId ?? "none"}:${reason}`;
    const now = Date.now();
    const last = idempotencyMap.get(key) ?? 0;

    if (now - last < WINDOW_MS) return true;

    idempotencyMap.set(key, now);
    return false;
  }

  static isExpAllowed(reason: string): boolean {
    return ALLOWED_EXP_SOURCES.has(reason);
  }

  static check(input: {
    userId: string;
    sessionId?: string;
    reason: string;
  }) {
    if (!this.isExpAllowed(input.reason)) {
      return { ok: false, error: "EXP blocked", code: "EXP_BLOCKED" };
    }

    if (!this.rateLimit(input.userId)) {
      return { ok: false, error: "Too many requests", code: "RATE_LIMITED" };
    }

    if (this.isDuplicate(input.userId, input.sessionId ?? null, input.reason)) {
      return { ok: false, error: "Duplicate blocked", code: "DUPLICATE" };
    }

    return null;
  }
}
