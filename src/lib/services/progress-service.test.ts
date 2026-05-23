import { ProgressReason } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  shouldDropMysterySeedMock,
  userFindUniqueMock,
  learningSessionFindUniqueMock,
  challengeSessionFindUniqueMock,
  studyMaterialFindUniqueMock,
  transactionMock,
  progressLedgerCreateMock,
  userUpdateMock,
  dailySnapshotUpsertMock,
  studyMaterialUpdateMock,
  materialProgressUpsertMock,
  forestStateFindUniqueMock,
  forestStateUpsertMock,
  biomeUnlockFindManyMock,
  biomeUnlockCreateManyMock,
} = vi.hoisted(() => ({
  shouldDropMysterySeedMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  learningSessionFindUniqueMock: vi.fn(),
  challengeSessionFindUniqueMock: vi.fn(),
  studyMaterialFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  progressLedgerCreateMock: vi.fn(),
  userUpdateMock: vi.fn(),
  dailySnapshotUpsertMock: vi.fn(),
  studyMaterialUpdateMock: vi.fn(),
  materialProgressUpsertMock: vi.fn(),
  forestStateFindUniqueMock: vi.fn(),
  forestStateUpsertMock: vi.fn(),
  biomeUnlockFindManyMock: vi.fn(),
  biomeUnlockCreateManyMock: vi.fn(),
}));

vi.mock("@/lib/domain/progression", async () => {
  const actual = await vi.importActual<typeof import("@/lib/domain/progression")>(
    "@/lib/domain/progression",
  );

  return {
    ...actual,
    shouldDropMysterySeed: shouldDropMysterySeedMock,
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    user: { findUnique: userFindUniqueMock },
    learningSession: { findUnique: learningSessionFindUniqueMock },
    challengeSession: { findUnique: challengeSessionFindUniqueMock },
    studyMaterial: { findUnique: studyMaterialFindUniqueMock },
    $transaction: transactionMock,
  },
}));

import { updateUserProgress } from "@/lib/services/progress-service";

type ForestStateRecord = {
  currentBiome: string;
  growthStage: number;
  healthScore: number;
  mysterySeedInventory: number;
  lastGrowthEventAt: Date | null;
};
type UserUpdateArgs = {
  where: { id: string };
  data: {
    totalExp: number;
    level: number;
    streakCount: number;
    longestStreak: number;
    consistencyScore: number;
    lastActiveAt: Date;
  };
};
type DailySnapshotUpsertArgs = {
  where: { userId_day: { day: Date } };
  create: {
    sessionsCompleted: number;
    minutesStudied: number;
    expEarned: number;
    consistencyScore: number;
    masteryGain: number;
    streakEnd: number;
  };
};
type ForestStateUpsertArgs = {
  create: ForestStateRecord & { userId: string };
  update: ForestStateRecord;
};
type BiomeUnlockCreateManyArgs = {
  data: Array<{
    biomeKey: string;
    viaMystery: boolean;
  }>;
};
type TransactionCallback = (tx: {
  progressLedger: { create: typeof progressLedgerCreateMock };
  user: { update: typeof userUpdateMock };
  dailyProgressSnapshot: { upsert: typeof dailySnapshotUpsertMock };
  studyMaterial: { update: typeof studyMaterialUpdateMock };
  materialProgress: { upsert: typeof materialProgressUpsertMock };
  forestState: {
    findUnique: typeof forestStateFindUniqueMock;
    upsert: typeof forestStateUpsertMock;
  };
  biomeUnlock: {
    findMany: typeof biomeUnlockFindManyMock;
    createMany: typeof biomeUnlockCreateManyMock;
  };
}) => unknown;

describe("updateUserProgress forest progression", () => {
  let forestStateRecord: ForestStateRecord | null;
  let biomeUnlockRows: Array<{ biomeKey: string; viaMystery: boolean }>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-23T20:30:00.000Z"));
    vi.clearAllMocks();

    forestStateRecord = null;
    biomeUnlockRows = [];

    shouldDropMysterySeedMock.mockReturnValue(false);
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      totalExp: 0,
      streakCount: 0,
      longestStreak: 0,
      consistencyScore: 0,
    });
    learningSessionFindUniqueMock.mockResolvedValue(null);
    challengeSessionFindUniqueMock.mockResolvedValue(null);
    studyMaterialFindUniqueMock.mockResolvedValue(null);
    progressLedgerCreateMock.mockResolvedValue({ id: "ledger-entry-1" });

    userUpdateMock.mockImplementation(async (args: UserUpdateArgs) => ({
      id: args.where.id,
      totalExp: args.data.totalExp,
      level: args.data.level,
      streakCount: args.data.streakCount,
      longestStreak: args.data.longestStreak,
      consistencyScore: args.data.consistencyScore,
      lastActiveAt: args.data.lastActiveAt,
    }));
    dailySnapshotUpsertMock.mockImplementation(
      async (args: DailySnapshotUpsertArgs) => ({
        day: args.where.userId_day.day,
        sessionsCompleted: args.create.sessionsCompleted,
        minutesStudied: args.create.minutesStudied,
        expEarned: args.create.expEarned,
        consistencyScore: args.create.consistencyScore,
        masteryGain: args.create.masteryGain,
        streakEnd: args.create.streakEnd,
      }),
    );

    studyMaterialUpdateMock.mockResolvedValue({ id: "material-1" });
    materialProgressUpsertMock.mockResolvedValue({
      completionPct: 0,
      confidenceScore: 0,
      recallStrength: 0,
      lastInteractionAt: new Date("2026-05-23T20:30:00.000Z"),
    });

    forestStateFindUniqueMock.mockImplementation(async () => forestStateRecord);
    forestStateUpsertMock.mockImplementation(async (args: ForestStateUpsertArgs) => {
      const source = forestStateRecord
        ? { ...forestStateRecord, ...args.update }
        : { ...args.create };

      forestStateRecord = {
        currentBiome: source.currentBiome,
        growthStage: source.growthStage,
        healthScore: source.healthScore,
        mysterySeedInventory: source.mysterySeedInventory,
        lastGrowthEventAt: source.lastGrowthEventAt ?? null,
      };

      return forestStateRecord;
    });

    biomeUnlockFindManyMock.mockImplementation(async () =>
      biomeUnlockRows.map((unlock) => ({ biomeKey: unlock.biomeKey })),
    );
    biomeUnlockCreateManyMock.mockImplementation(
      async (args: BiomeUnlockCreateManyArgs) => {
        for (const unlock of args.data) {
          if (
            !biomeUnlockRows.some(
              (existing) => existing.biomeKey === unlock.biomeKey,
            )
          ) {
            biomeUnlockRows.push({
              biomeKey: unlock.biomeKey,
              viaMystery: unlock.viaMystery,
            });
          }
        }

        return { count: args.data.length };
      },
    );

    transactionMock.mockImplementation(async (callback: TransactionCallback) =>
      callback({
        progressLedger: { create: progressLedgerCreateMock },
        user: { update: userUpdateMock },
        dailyProgressSnapshot: { upsert: dailySnapshotUpsertMock },
        studyMaterial: { update: studyMaterialUpdateMock },
        materialProgress: { upsert: materialProgressUpsertMock },
        forestState: {
          findUnique: forestStateFindUniqueMock,
          upsert: forestStateUpsertMock,
        },
        biomeUnlock: {
          findMany: biomeUnlockFindManyMock,
          createMany: biomeUnlockCreateManyMock,
        },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("unlocks threshold biomes and awards mystery seeds for qualifying progress", async () => {
    shouldDropMysterySeedMock.mockReturnValue(true);
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      totalExp: 0,
      streakCount: 2,
      longestStreak: 5,
      consistencyScore: 6,
    });

    const result = await updateUserProgress({
      userId: "user-1",
      reason: ProgressReason.SESSION_COMPLETE,
      expDelta: 3_200,
      consistencyDelta: 4,
      masteryDelta: 0.2,
      streakDelta: 1,
      sessionsCompletedDelta: 1,
      minutesStudiedDelta: 30,
    });

    expect(result.forestProgress.currentBiome).toBe("riverlight_basin");
    expect(result.forestProgress.unlockedBiomes).toEqual([
      "seedling_meadow",
      "canopy_glade",
      "riverlight_basin",
    ]);
    expect(result.forestProgress.newlyUnlockedBiomes).toEqual([
      "seedling_meadow",
      "canopy_glade",
      "riverlight_basin",
    ]);
    expect(result.forestProgress.mysterySeedsAwarded).toBe(1);
    expect(result.forestProgress.mysterySeedInventory).toBe(1);
    expect(biomeUnlockCreateManyMock).toHaveBeenCalledTimes(1);
  });

  it("consumes mystery seeds to unlock the next biome ahead of exp threshold", async () => {
    shouldDropMysterySeedMock.mockReturnValue(true);
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      totalExp: 1_350,
      streakCount: 5,
      longestStreak: 9,
      consistencyScore: 10,
    });
    forestStateRecord = {
      currentBiome: "canopy_glade",
      growthStage: 3,
      healthScore: 84,
      mysterySeedInventory: 2,
      lastGrowthEventAt: new Date("2026-05-22T20:30:00.000Z"),
    };
    biomeUnlockRows = [
      { biomeKey: "seedling_meadow", viaMystery: false },
      { biomeKey: "canopy_glade", viaMystery: false },
    ];

    const result = await updateUserProgress({
      userId: "user-1",
      reason: ProgressReason.SESSION_COMPLETE,
      expDelta: 150,
      consistencyDelta: 2,
      masteryDelta: 0.1,
      streakDelta: 1,
      sessionsCompletedDelta: 1,
      minutesStudiedDelta: 12,
    });

    expect(result.forestProgress.currentBiome).toBe("riverlight_basin");
    expect(result.forestProgress.newlyUnlockedBiomes).toEqual(["riverlight_basin"]);
    expect(result.forestProgress.mysterySeedsAwarded).toBe(1);
    expect(result.forestProgress.mysterySeedInventory).toBe(0);
    expect(biomeUnlockCreateManyMock).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          biomeKey: "riverlight_basin",
          viaMystery: true,
          userId: "user-1",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("keeps unlock writes idempotent when no new thresholds are crossed", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      totalExp: 1_400,
      streakCount: 4,
      longestStreak: 9,
      consistencyScore: 12,
    });
    const priorGrowthEvent = new Date("2026-05-21T00:00:00.000Z");
    forestStateRecord = {
      currentBiome: "canopy_glade",
      growthStage: 3,
      healthScore: 77,
      mysterySeedInventory: 1,
      lastGrowthEventAt: priorGrowthEvent,
    };
    biomeUnlockRows = [
      { biomeKey: "seedling_meadow", viaMystery: false },
      { biomeKey: "canopy_glade", viaMystery: false },
    ];

    const result = await updateUserProgress({
      userId: "user-1",
      reason: ProgressReason.MATERIAL_REVIEW,
      expDelta: 0,
      consistencyDelta: 0,
      masteryDelta: 0,
      streakDelta: 0,
    });

    expect(result.forestProgress.unlockedBiomes).toEqual([
      "seedling_meadow",
      "canopy_glade",
    ]);
    expect(result.forestProgress.newlyUnlockedBiomes).toEqual([]);
    expect(result.forestProgress.mysterySeedInventory).toBe(1);
    expect(result.forestProgress.lastGrowthEventAt).toBe(
      priorGrowthEvent.toISOString(),
    );
    expect(biomeUnlockCreateManyMock).not.toHaveBeenCalled();
    expect(shouldDropMysterySeedMock).not.toHaveBeenCalled();
  });
});
