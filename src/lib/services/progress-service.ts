import { ProgressReason, Prisma } from "@prisma/client";

import { db } from "@/lib/db/client";
import {
  calculateForestHealthScore,
  growthStageFromTotalExp,
  resolveCurrentBiomeForTotalExp,
  resolveUnlockedBiomesForTotalExp,
  shouldDropMysterySeed,
} from "@/lib/domain/progression";
import { forestThemeTokens } from "@/lib/design/tokens";
import { ServiceError } from "@/lib/services/service-error";

type MaterialProgressPatch = {
  completionPct?: number;
  confidenceScore?: number;
  recallStrength?: number;
};

export interface UpdateUserProgressInput {
  userId: string;
  reason: ProgressReason;
  expDelta: number;
  consistencyDelta?: number;
  masteryDelta?: number;
  streakDelta?: number;
  sessionId?: string;
  challengeSessionId?: string;
  sourceMaterialId?: string;
  sessionsCompletedDelta?: number;
  minutesStudiedDelta?: number;
  metadata?: Prisma.InputJsonValue;
  materialProgress?: MaterialProgressPatch;
}

export interface UpdateUserProgressResult {
  user: {
    id: string;
    totalExp: number;
    level: number;
    streakCount: number;
    longestStreak: number;
    consistencyScore: number;
    lastActiveAt: string | null;
  };
  progressEntryId: string;
  dailySnapshot: {
    day: string;
    sessionsCompleted: number;
    minutesStudied: number;
    expEarned: number;
    consistencyScore: number;
    masteryGain: number;
    streakEnd: number;
  };
  materialProgress: {
    completionPct: number;
    confidenceScore: number;
    recallStrength: number;
    lastInteractionAt: string | null;
  } | null;
  forestProgress: {
    currentBiome: string;
    growthStage: number;
    healthScore: number;
    mysterySeedInventory: number;
    unlockedBiomes: string[];
    newlyUnlockedBiomes: string[];
    mysterySeedsAwarded: number;
    lastGrowthEventAt: string | null;
  };
}

function toUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function levelFromTotalExp(totalExp: number): number {
  return Math.max(1, Math.floor(totalExp / 500) + 1);
}

function inferSessionsCompletedDelta(input: UpdateUserProgressInput): number {
  if (typeof input.sessionsCompletedDelta === "number") {
    return Math.max(0, Math.trunc(input.sessionsCompletedDelta));
  }

  if (
    input.reason === ProgressReason.SESSION_COMPLETE ||
    input.reason === ProgressReason.CHALLENGE_REWARD
  ) {
    return 1;
  }

  return 0;
}

const mysterySeedEligibleReasons = new Set<ProgressReason>([
  ProgressReason.SESSION_COMPLETE,
  ProgressReason.CHALLENGE_REWARD,
  ProgressReason.DAILY_CHECK_IN,
]);

export async function updateUserProgress(
  input: UpdateUserProgressInput,
): Promise<UpdateUserProgressResult> {
  const expDelta = Math.trunc(input.expDelta);
  const consistencyDelta = input.consistencyDelta ?? 0;
  const masteryDelta = input.masteryDelta ?? 0;
  const streakDelta = Math.trunc(input.streakDelta ?? 0);
  const sessionsCompletedDelta = inferSessionsCompletedDelta(input);
  const minutesStudiedDelta = Math.max(0, Math.trunc(input.minutesStudiedDelta ?? 0));
  const now = new Date();
  const day = toUtcDay(now);

  const [user, linkedSession, linkedChallenge, linkedMaterial] = await Promise.all([
    db.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        totalExp: true,
        streakCount: true,
        longestStreak: true,
        consistencyScore: true,
      },
    }),
    input.sessionId
      ? db.learningSession.findUnique({
          where: { id: input.sessionId },
          select: { id: true, userId: true },
        })
      : Promise.resolve(null),
    input.challengeSessionId
      ? db.challengeSession.findUnique({
          where: { id: input.challengeSessionId },
          select: { id: true, userId: true },
        })
      : Promise.resolve(null),
    input.sourceMaterialId
      ? db.studyMaterial.findUnique({
          where: { id: input.sourceMaterialId },
          select: { id: true, ownerId: true },
        })
      : Promise.resolve(null),
  ]);

  if (!user) {
    throw new ServiceError("User not found.", {
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  }

  if (input.sessionId && (!linkedSession || linkedSession.userId !== input.userId)) {
    throw new ServiceError("Session not found for user.", {
      statusCode: 404,
      code: "SESSION_NOT_FOUND",
    });
  }

  if (
    input.challengeSessionId &&
    (!linkedChallenge || linkedChallenge.userId !== input.userId)
  ) {
    throw new ServiceError("Challenge session not found for user.", {
      statusCode: 404,
      code: "CHALLENGE_NOT_FOUND",
    });
  }

  if (
    input.sourceMaterialId &&
    (!linkedMaterial || linkedMaterial.ownerId !== input.userId)
  ) {
    throw new ServiceError("Study material not found for user.", {
      statusCode: 404,
      code: "MATERIAL_NOT_FOUND",
    });
  }

  const nextTotalExp = Math.max(0, user.totalExp + expDelta);
  const nextLevel = levelFromTotalExp(nextTotalExp);
  const nextStreak = Math.max(0, user.streakCount + streakDelta);
  const nextLongestStreak = Math.max(user.longestStreak, nextStreak);
  const nextConsistencyScore = Math.max(0, user.consistencyScore + consistencyDelta);

  const materialProgressPatch = input.materialProgress
    ? {
        completionPct:
          typeof input.materialProgress.completionPct === "number"
            ? clamp(input.materialProgress.completionPct, 0, 100)
            : undefined,
        confidenceScore:
          typeof input.materialProgress.confidenceScore === "number"
            ? clamp(input.materialProgress.confidenceScore, 0, 1)
            : undefined,
        recallStrength:
          typeof input.materialProgress.recallStrength === "number"
            ? clamp(input.materialProgress.recallStrength, 0, 1)
            : undefined,
      }
    : undefined;

  const result = await db.$transaction(async (tx) => {
    const progressEntry = await tx.progressLedger.create({
      data: {
        userId: input.userId,
        reason: input.reason,
        expDelta,
        consistencyDelta,
        masteryDelta,
        streakDelta,
        sessionId: input.sessionId ?? null,
        challengeSessionId: input.challengeSessionId ?? null,
        sourceMaterialId: input.sourceMaterialId ?? null,
        metadata: input.metadata,
      },
      select: { id: true },
    });

    const updatedUser = await tx.user.update({
      where: { id: input.userId },
      data: {
        totalExp: nextTotalExp,
        level: nextLevel,
        streakCount: nextStreak,
        longestStreak: nextLongestStreak,
        consistencyScore: nextConsistencyScore,
        lastActiveAt: now,
      },
      select: {
        id: true,
        totalExp: true,
        level: true,
        streakCount: true,
        longestStreak: true,
        consistencyScore: true,
        lastActiveAt: true,
      },
    });

    const dailySnapshot = await tx.dailyProgressSnapshot.upsert({
      where: {
        userId_day: {
          userId: input.userId,
          day,
        },
      },
      create: {
        userId: input.userId,
        day,
        sessionsCompleted: sessionsCompletedDelta,
        minutesStudied: minutesStudiedDelta,
        expEarned: expDelta,
        consistencyScore: consistencyDelta,
        masteryGain: masteryDelta,
        streakEnd: nextStreak,
      },
      update: {
        sessionsCompleted: { increment: sessionsCompletedDelta },
        minutesStudied: { increment: minutesStudiedDelta },
        expEarned: { increment: expDelta },
        consistencyScore: { increment: consistencyDelta },
        masteryGain: { increment: masteryDelta },
        streakEnd: nextStreak,
      },
      select: {
        day: true,
        sessionsCompleted: true,
        minutesStudied: true,
        expEarned: true,
        consistencyScore: true,
        masteryGain: true,
        streakEnd: true,
      },
    });

    let updatedMaterialProgress: {
      completionPct: number;
      confidenceScore: number;
      recallStrength: number;
      lastInteractionAt: Date | null;
    } | null = null;

    if (input.sourceMaterialId) {
      await tx.studyMaterial.update({
        where: { id: input.sourceMaterialId },
        data: {
          lastStudiedAt: now,
        },
      });

      updatedMaterialProgress = await tx.materialProgress.upsert({
        where: {
          userId_materialId: {
            userId: input.userId,
            materialId: input.sourceMaterialId,
          },
        },
        create: {
          userId: input.userId,
          materialId: input.sourceMaterialId,
          completionPct: materialProgressPatch?.completionPct ?? 0,
          confidenceScore: materialProgressPatch?.confidenceScore ?? 0,
          recallStrength: materialProgressPatch?.recallStrength ?? 0,
          lastInteractionAt: now,
        },
        update: {
          completionPct: materialProgressPatch?.completionPct,
          confidenceScore: materialProgressPatch?.confidenceScore,
          recallStrength: materialProgressPatch?.recallStrength,
          lastInteractionAt: now,
        },
        select: {
          completionPct: true,
          confidenceScore: true,
          recallStrength: true,
          lastInteractionAt: true,
        },
      });
    }

    const existingForestState = await tx.forestState.findUnique({
      where: { userId: input.userId },
      select: {
        currentBiome: true,
        growthStage: true,
        healthScore: true,
        mysterySeedInventory: true,
        lastGrowthEventAt: true,
      },
    });

    const existingBiomeUnlocks = await tx.biomeUnlock.findMany({
      where: { userId: input.userId },
      select: { biomeKey: true },
      orderBy: { unlockedAt: "asc" },
    });

    const unlockedBiomeSet = new Set(
      existingBiomeUnlocks.map((unlock) => unlock.biomeKey),
    );
    const newlyUnlockedBiomes: string[] = [];
    const unlockEntries: Array<{ biomeKey: string; viaMystery: boolean }> = [];

    for (const biomeKey of resolveUnlockedBiomesForTotalExp(nextTotalExp)) {
      if (!unlockedBiomeSet.has(biomeKey)) {
        unlockedBiomeSet.add(biomeKey);
        newlyUnlockedBiomes.push(biomeKey);
        unlockEntries.push({ biomeKey, viaMystery: false });
      }
    }

    const mysterySeedsAwarded =
      mysterySeedEligibleReasons.has(input.reason) &&
      expDelta > 0 &&
      shouldDropMysterySeed(nextStreak)
        ? 1
        : 0;

    let nextMysterySeedInventory =
      (existingForestState?.mysterySeedInventory ?? 0) + mysterySeedsAwarded;
    let nextBiome = resolveCurrentBiomeForTotalExp(nextTotalExp);
    const currentBiomeIndex = forestThemeTokens.biomeLadder.findIndex(
      (biome) => biome.key === nextBiome,
    );

    if (nextMysterySeedInventory >= 3 && currentBiomeIndex >= 0) {
      const mysteryUnlockCandidate =
        forestThemeTokens.biomeLadder[currentBiomeIndex + 1]?.key;

      if (mysteryUnlockCandidate && !unlockedBiomeSet.has(mysteryUnlockCandidate)) {
        unlockedBiomeSet.add(mysteryUnlockCandidate);
        newlyUnlockedBiomes.push(mysteryUnlockCandidate);
        unlockEntries.push({ biomeKey: mysteryUnlockCandidate, viaMystery: true });
        nextBiome = mysteryUnlockCandidate;
        nextMysterySeedInventory -= 3;
      }
    }

    if (unlockEntries.length > 0) {
      await tx.biomeUnlock.createMany({
        data: unlockEntries.map((unlock) => ({
          userId: input.userId,
          biomeKey: unlock.biomeKey,
          unlockedAt: now,
          viaMystery: unlock.viaMystery,
        })),
        skipDuplicates: true,
      });
    }

    const orderedLadderKeys = new Set<string>(
      forestThemeTokens.biomeLadder.map((biome) => biome.key),
    );
    const unlockedBiomes = [
      ...forestThemeTokens.biomeLadder
        .map((biome) => biome.key)
        .filter((key) => unlockedBiomeSet.has(key)),
      ...Array.from(unlockedBiomeSet)
        .filter((key) => !orderedLadderKeys.has(key))
        .sort((left, right) => left.localeCompare(right)),
    ];

    const nextGrowthStage = growthStageFromTotalExp(nextTotalExp);
    const nextHealthScore = calculateForestHealthScore({
      previousHealthScore: existingForestState?.healthScore ?? 100,
      expDelta,
      consistencyDelta,
      masteryDelta,
      streakDelta,
      sessionsCompletedDelta,
      minutesStudiedDelta,
    });

    const hasGrowthEvent =
      expDelta > 0 ||
      mysterySeedsAwarded > 0 ||
      unlockEntries.length > 0 ||
      !existingForestState ||
      nextGrowthStage !== existingForestState.growthStage ||
      nextBiome !== existingForestState.currentBiome;

    const forestState = await tx.forestState.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        currentBiome: nextBiome,
        growthStage: nextGrowthStage,
        healthScore: nextHealthScore,
        mysterySeedInventory: nextMysterySeedInventory,
        lastGrowthEventAt: hasGrowthEvent ? now : null,
      },
      update: {
        currentBiome: nextBiome,
        growthStage: nextGrowthStage,
        healthScore: nextHealthScore,
        mysterySeedInventory: nextMysterySeedInventory,
        lastGrowthEventAt: hasGrowthEvent
          ? now
          : existingForestState?.lastGrowthEventAt ?? null,
      },
      select: {
        currentBiome: true,
        growthStage: true,
        healthScore: true,
        mysterySeedInventory: true,
        lastGrowthEventAt: true,
      },
    });

    return {
      updatedUser,
      progressEntry,
      dailySnapshot,
      updatedMaterialProgress,
      forestState,
      unlockedBiomes,
      newlyUnlockedBiomes,
      mysterySeedsAwarded,
    };
  });

  return {
    user: {
      id: result.updatedUser.id,
      totalExp: result.updatedUser.totalExp,
      level: result.updatedUser.level,
      streakCount: result.updatedUser.streakCount,
      longestStreak: result.updatedUser.longestStreak,
      consistencyScore: result.updatedUser.consistencyScore,
      lastActiveAt: result.updatedUser.lastActiveAt?.toISOString() ?? null,
    },
    progressEntryId: result.progressEntry.id,
    dailySnapshot: {
      day: result.dailySnapshot.day.toISOString(),
      sessionsCompleted: result.dailySnapshot.sessionsCompleted,
      minutesStudied: result.dailySnapshot.minutesStudied,
      expEarned: result.dailySnapshot.expEarned,
      consistencyScore: result.dailySnapshot.consistencyScore,
      masteryGain: result.dailySnapshot.masteryGain,
      streakEnd: result.dailySnapshot.streakEnd,
    },
    materialProgress: result.updatedMaterialProgress
      ? {
          completionPct: result.updatedMaterialProgress.completionPct,
          confidenceScore: result.updatedMaterialProgress.confidenceScore,
          recallStrength: result.updatedMaterialProgress.recallStrength,
          lastInteractionAt:
            result.updatedMaterialProgress.lastInteractionAt?.toISOString() ?? null,
        }
      : null,
    forestProgress: {
      currentBiome: result.forestState.currentBiome,
      growthStage: result.forestState.growthStage,
      healthScore: result.forestState.healthScore,
      mysterySeedInventory: result.forestState.mysterySeedInventory,
      unlockedBiomes: result.unlockedBiomes,
      newlyUnlockedBiomes: result.newlyUnlockedBiomes,
      mysterySeedsAwarded: result.mysterySeedsAwarded,
      lastGrowthEventAt: result.forestState.lastGrowthEventAt?.toISOString() ?? null,
    },
  };
}
