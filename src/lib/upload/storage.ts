export interface UploadTicketRequest {
  ownerId: string;
  fileName: string;
  contentType: string;
}

export interface UploadTicket {
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

export interface StorageAdapter {
  createUploadTicket(request: UploadTicketRequest): Promise<UploadTicket>;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class PlaceholderStorageAdapter implements StorageAdapter {
  async createUploadTicket(request: UploadTicketRequest): Promise<UploadTicket> {
    const fileSlug = slugify(request.fileName) || "study-material";
    const objectKey = `materials/${request.ownerId}/${Date.now()}-${fileSlug}`;

    return {
      objectKey,
      uploadUrl: `https://example-storage.local/upload/${objectKey}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      requiredHeaders: {
        "content-type": request.contentType,
      },
    };
  }
}

export const storageAdapter: StorageAdapter = new PlaceholderStorageAdapter();
