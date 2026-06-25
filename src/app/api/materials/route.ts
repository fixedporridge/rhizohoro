import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { isServiceError } from "@/lib/services/service-error";
import { ServiceError } from "@/lib/services/service-error";
import { createStudyMaterial } from "@/lib/services/study-material-service";

const createStudyMaterialPayloadSchema = z
  .object({
    workspaceId: z.string().min(1).optional(),
    title: z.string().min(3).max(160),
    description: z.string().max(500).optional(),
    sourceType: z.enum(["pdf", "docx", "slides", "note", "text", "link"]),
    sourceUri: z.string().url().optional(),
    rawText: z.string().min(20).optional(),
    tags: z.array(z.string().min(1).max(32)).max(20).optional(),
    mimeType: z.string().max(120).optional(),
    fileSizeBytes: z.number().int().positive().max(50_000_000).optional(),
    preExamFocus: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.sourceUri && !value.rawText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceUri"],
        message: "Provide either sourceUri or rawText.",
      });
    }
  });

async function resolveWorkspaceIdForUser(
  ownerId: string,
  requestedWorkspaceId?: string,
): Promise<string> {
  if (requestedWorkspaceId) {
    const requestedWorkspace = await db.studyWorkspace.findFirst({
      where: {
        id: requestedWorkspaceId,
        ownerId,
      },
      select: { id: true },
    });

    if (!requestedWorkspace) {
      throw new ServiceError("Study workspace was not found for this user.", {
        statusCode: 404,
        code: "WORKSPACE_NOT_FOUND",
      });
    }

    return requestedWorkspace.id;
  }

  const defaultWorkspace = await db.studyWorkspace.findFirst({
    where: { ownerId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (defaultWorkspace) {
    return defaultWorkspace.id;
  }

  const createdWorkspace = await db.studyWorkspace.create({
    data: {
      ownerId,
      name: "My Study Vault",
    },
    select: { id: true },
  });

  return createdWorkspace.id;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createStudyMaterialPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid study material payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const authUser = await requireAuthenticatedUser(request);
    const workspaceId = await resolveWorkspaceIdForUser(
      authUser.id,
      parsed.data.workspaceId,
    );
    const created = await createStudyMaterial({
      ...parsed.data,
      workspaceId,
      ownerId: authUser.id,
    });
    return NextResponse.json(
      {
        ok: true,
        data: created,
      },
      { status: 201 },
    );
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
