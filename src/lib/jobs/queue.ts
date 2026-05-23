export type QueueJobName =
  | "material.ingest"
  | "material.chunk"
  | "cards.generate"
  | "quiz.generate"
  | "session.post-process";

export interface QueueJob<TPayload = unknown> {
  name: QueueJobName;
  payload: TPayload;
  dedupeKey?: string;
}

export interface QueueEnqueueResult {
  accepted: boolean;
  queuedAt: string;
}

export interface QueueAdapter {
  enqueue<TPayload>(job: QueueJob<TPayload>): Promise<QueueEnqueueResult>;
}

class NoopQueueAdapter implements QueueAdapter {
  async enqueue<TPayload>(job: QueueJob<TPayload>): Promise<QueueEnqueueResult> {
    if (!job.name) {
      return {
        accepted: false,
        queuedAt: new Date().toISOString(),
      };
    }

    return {
      accepted: true,
      queuedAt: new Date().toISOString(),
    };
  }
}

export const queueAdapter: QueueAdapter = new NoopQueueAdapter();
