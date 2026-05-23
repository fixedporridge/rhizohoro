import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { isServiceError } from "@/lib/services/service-error";
import { createStudyMaterial } from "@/lib/services/study-material-service";

const ingestPayloadSchema = z
  .object({
    workspaceId: z.string().min(1),
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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = ingestPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid ingest payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const authUser = await requireAuthenticatedUser(request);
    const created = await createStudyMaterial({
      ...parsed.data,
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
