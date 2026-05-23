import { createHash } from "node:crypto";

import { queueAdapter } from "@/lib/jobs/queue";
import { storageAdapter } from "@/lib/upload/storage";

export type MaterialSourceType =
  | "pdf"
  | "docx"
  | "slides"
  | "note"
  | "text"
  | "link";

export interface IngestMaterialInput {
  ownerId: string;
  workspaceId: string;
  title: string;
  sourceType: MaterialSourceType;
  sourceUri?: string;
  rawText?: string;
  preExamFocus?: boolean;
}

export interface IngestMaterialResult {
  accepted: boolean;
  queueJob: string;
  objectKey: string;
  dedupeKey: string;
  uploadUrl: string;
}

export async function enqueueMaterialIngestion(
  input: IngestMaterialInput,
): Promise<IngestMaterialResult> {
  const normalizedTitle = input.title.trim();
  const dedupeKey = createHash("sha1")
    .update(
      `${input.ownerId}:${input.workspaceId}:${normalizedTitle}:${input.sourceType}`,
    )
    .digest("hex");

  const ticket = await storageAdapter.createUploadTicket({
    ownerId: input.ownerId,
    fileName: `${normalizedTitle}.txt`,
    contentType: "text/plain",
  });

  await queueAdapter.enqueue({
    name: "material.ingest",
    dedupeKey,
    payload: {
      ownerId: input.ownerId,
      workspaceId: input.workspaceId,
      title: normalizedTitle,
      sourceType: input.sourceType,
      sourceUri: input.sourceUri ?? null,
      rawTextProvided: Boolean(input.rawText),
      preExamFocus: Boolean(input.preExamFocus),
      objectKey: ticket.objectKey,
    },
  });

  return {
    accepted: true,
    queueJob: "material.ingest",
    objectKey: ticket.objectKey,
    dedupeKey,
    uploadUrl: ticket.uploadUrl,
  };
}
