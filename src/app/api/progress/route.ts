import { Prisma, ProgressReason } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ProgressGuard } from "@/lib/server/progress-guard";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  getUserProgressSnapshot,
  updateUserProgress,
} from "@/lib/services/progress-service";
import { isServiceError } from "@/lib/services/service-error";

const progressUpdatePayloadSchema = z
  .object({
    reason: z.nativeEnum(ProgressReason),
    expDelta: z.number().int().min(-10_000).max(10_000),
    consistencyDelta: z.number().min(-100).max(100).optional(),
    masteryDelta: z.number().min(-1).max(1).optional(),
    streakDelta: z.number().int().min(-7).max(7).optional(),
    sessionId: z.string().min(1).optional(),
    challengeSessionId: z.string().min(1).optional(),
    sourceMaterialId: z.string().min(1).optional(),
    sessionsCompletedDelta: z.number().int().min(0).max(20).optional(),
    minutesStudiedDelta: z.number().int().min(0).max(600).optional(),
    metadata: z.unknown().optional(),
    materialProgress: z
      .object({
        completionPct: z.number().min(0).max(100).optional(),
        confidenceScore: z.number().min(0).max(1).optional(),
        recallStrength: z.number().min(0).max(1).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sessionId && value.challengeSessionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["challengeSessionId"],
        message: "Provide either sessionId or challengeSessionId, not both.",
      });
    }
  });

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuthenticatedUser(request);
    const snapshot = await getUserProgressSnapshot(authUser.id);
    return NextResponse.json({
      ok: true,
      data: snapshot,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const parsed = progressUpdatePayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid progress update payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const authUser = await requireAuthenticatedUser(request);

    const guard = ProgressGuard.check({
      userId: authUser.id,
      sessionId: parsed.data.sessionId,
      reason: parsed.data.reason,
    });

    if (guard) {
      return NextResponse.json(guard, { status: 403 });
    }

    const result = await updateUserProgress({
      ...parsed.data,
      userId: authUser.id,
      metadata: parsed.data.metadata as Prisma.InputJsonValue | undefined,
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error.",
      },
      { status: 500 },
    );
  }
}
