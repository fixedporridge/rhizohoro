import { createHash } from "node:crypto";

import { MaterialType, ParseStatus } from "@prisma/client";

import { db } from "@/lib/db/client";
import { queueAdapter } from "@/lib/jobs/queue";
import {
  generateInitialQuizForMaterial,
  type InitialGeneratedQuiz,
} from "@/lib/services/quiz-generation-service";
import { ServiceError } from "@/lib/services/service-error";
import { storageAdapter } from "@/lib/upload/storage";

export type MaterialSourceType =
  | "pdf"
  | "docx"
  | "slides"
  | "note"
  | "text"
  | "link";

export interface CreateStudyMaterialInput {
  ownerId: string;
  workspaceId: string;
  title: string;
  description?: string;
  sourceType: MaterialSourceType;
  sourceUri?: string;
  rawText?: string;
  tags?: string[];
  mimeType?: string;
  fileSizeBytes?: number;
  preExamFocus?: boolean;
}

export interface CreateStudyMaterialResult {
  material: {
    id: string;
    ownerId: string;
    workspaceId: string;
    title: string;
    materialType: MaterialType;
    parseStatus: ParseStatus;
    sourceUri: string | null;
    createdAt: string;
  };
  ingestion: {
    queueJob: "material.ingest";
    dedupeKey: string;
    objectKey: string;
    uploadUrl: string;
    expiresAt: string;
    requiredHeaders: Record<string, string>;
    accepted: boolean;
  };
  initialQuiz: InitialGeneratedQuiz | null;
}

const MATERIAL_TYPE_MAP: Record<MaterialSourceType, MaterialType> = {
  pdf: MaterialType.PDF,
  docx: MaterialType.DOCX,
  slides: MaterialType.SLIDES,
  note: MaterialType.NOTE,
  text: MaterialType.TEXT,
  link: MaterialType.LINK,
};

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
        .slice(0, 20),
    ),
  );
}

export async function createStudyMaterial(
  input: CreateStudyMaterialInput,
): Promise<CreateStudyMaterialResult> {
  const title = input.title.trim();
  if (!title) {
    throw new ServiceError("Title is required.", {
      statusCode: 400,
      code: "INVALID_TITLE",
    });
  }

  if (!input.sourceUri && !input.rawText) {
    throw new ServiceError("Provide either sourceUri or rawText.", {
      statusCode: 400,
      code: "MISSING_SOURCE",
    });
  }

  const [owner, workspace] = await Promise.all([
    db.user.findUnique({
      where: { id: input.ownerId },
      select: { id: true },
    }),
    db.studyWorkspace.findFirst({
      where: {
        id: input.workspaceId,
        ownerId: input.ownerId,
      },
      select: { id: true },
    }),
  ]);

  if (!owner) {
    throw new ServiceError("Owner user was not found.", {
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
  }

  if (!workspace) {
    throw new ServiceError(
      "Study workspace was not found for this user.",
      {
        statusCode: 404,
        code: "WORKSPACE_NOT_FOUND",
      },
    );
  }

  const materialType = MATERIAL_TYPE_MAP[input.sourceType];
  const ticket = await storageAdapter.createUploadTicket({
    ownerId: input.ownerId,
    fileName: `${title}.${input.sourceType}`,
    contentType: input.mimeType ?? "text/plain",
  });

  const dedupeKey = createHash("sha1")
    .update(
      `${input.ownerId}:${input.workspaceId}:${title}:${input.sourceType}:${input.sourceUri ?? ""}:${input.rawText ?? ""}`,
    )
    .digest("hex");

  const material = await db.$transaction(async (tx) => {
    const createdMaterial = await tx.studyMaterial.create({
      data: {
        ownerId: input.ownerId,
        workspaceId: input.workspaceId,
        title,
        description: input.description?.trim() || null,
        materialType,
        sourceUri: input.sourceUri ?? null,
        mimeType: input.mimeType ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        contentHash: createHash("sha1")
          .update(input.sourceUri ?? input.rawText ?? title)
          .digest("hex"),
        parseStatus: ParseStatus.PENDING,
        tags: normalizeTags(input.tags),
      },
    });

    await tx.materialProgress.upsert({
      where: {
        userId_materialId: {
          userId: input.ownerId,
          materialId: createdMaterial.id,
        },
      },
      create: {
        userId: input.ownerId,
        materialId: createdMaterial.id,
        completionPct: 0,
        confidenceScore: 0,
        recallStrength: 0,
      },
      update: {},
    });

    return createdMaterial;
  });

  const queueResult = await queueAdapter.enqueue({
    name: "material.ingest",
    dedupeKey,
    payload: {
      materialId: material.id,
      ownerId: input.ownerId,
      workspaceId: input.workspaceId,
      title,
      sourceType: input.sourceType,
      sourceUri: input.sourceUri ?? null,
      rawText: input.rawText ?? null,
      objectKey: ticket.objectKey,
      preExamFocus: Boolean(input.preExamFocus),
    },
  });

  const normalizedRawText = input.rawText?.trim();
  const initialQuiz =
    normalizedRawText && normalizedRawText.length >= 20
      ? await generateInitialQuizForMaterial({
          ownerId: input.ownerId,
          materialId: material.id,
          materialTitle: material.title,
          sourceText: normalizedRawText,
        })
      : null;

  return {
    material: {
      id: material.id,
      ownerId: material.ownerId,
      workspaceId: material.workspaceId,
      title: material.title,
      materialType: material.materialType,
      parseStatus: initialQuiz ? ParseStatus.READY : material.parseStatus,
      sourceUri: material.sourceUri,
      createdAt: material.createdAt.toISOString(),
    },
    ingestion: {
      queueJob: "material.ingest",
      dedupeKey,
      objectKey: ticket.objectKey,
      uploadUrl: ticket.uploadUrl,
      expiresAt: ticket.expiresAt,
      requiredHeaders: ticket.requiredHeaders,
      accepted: queueResult.accepted,
    },
    initialQuiz,
  };
}
