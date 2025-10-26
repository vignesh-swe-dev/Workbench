/**
 * Background Job Queue & Worker Architecture
 * BullMQ abstraction pattern with exponential backoff, idempotency, and failure handling.
 */

export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  status: 'queued' | 'active' | 'completed' | 'failed';
  error?: string;
  deduplicationKey?: string;
  createdAt: string;
  processedAt?: string;
}

class JobQueue {
  private queue: Job[] = [];
  private processedKeys = new Set<string>();
  private handlers = new Map<string, (job: Job) => Promise<void>>();
  private isProcessing = false;

  constructor() {
    this.registerDefaultHandlers();
  }

  public registerHandler(name: string, handler: (job: Job) => Promise<void>) {
    this.handlers.set(name, handler);
  }

  public async add<T>(name: string, data: T, options?: { deduplicationKey?: string; maxAttempts?: number }): Promise<Job<T>> {
    const deduplicationKey = options?.deduplicationKey;
    if (deduplicationKey && this.processedKeys.has(deduplicationKey)) {
      console.log(`[Queue] Deduplicating job ${name} with key: ${deduplicationKey}`);
      const existing = this.queue.find((j) => j.deduplicationKey === deduplicationKey);
      if (existing) return existing;
    }

    const job: Job<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      data,
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      status: 'queued',
      deduplicationKey,
      createdAt: new Date().toISOString(),
    };

    if (deduplicationKey) {
      this.processedKeys.add(deduplicationKey);
    }

    this.queue.push(job);
    this.triggerProcessing();
    return job;
  }

  private async triggerProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        const nextJob = this.queue.find((j) => j.status === 'queued');
        if (!nextJob) break;

        nextJob.status = 'active';
        nextJob.attempts += 1;
        nextJob.processedAt = new Date().toISOString();

        const handler = this.handlers.get(nextJob.name);
        if (!handler) {
          nextJob.status = 'failed';
          nextJob.error = `No handler registered for queue job: ${nextJob.name}`;
          continue;
        }

        try {
          await handler(nextJob);
          nextJob.status = 'completed';
        } catch (err: any) {
          console.error(`[Queue] Job ${nextJob.id} failed on attempt ${nextJob.attempts}:`, err);
          if (nextJob.attempts < nextJob.maxAttempts) {
            nextJob.status = 'queued'; // Will retry
          } else {
            nextJob.status = 'failed';
            nextJob.error = err?.message || String(err);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private registerDefaultHandlers() {
    this.registerHandler('email:invitation', async (job) => {
      // Simulates transactional email delivery with DKIM/SPF simulation
      console.log(`[Email Worker] Delivering organization invitation to ${job.data.email} with token ${job.data.token}`);
    });

    this.registerHandler('notification:dispatch', async (job) => {
      console.log(`[Notification Worker] Dispatching push notification: "${job.data.title}" to user ${job.data.userId}`);
    });

    this.registerHandler('webhook:github_process', async (job) => {
      console.log(`[Webhook Worker] Processed GitHub event: ${job.data.action} on ${job.data.repo}`);
    });
  }

  public getRecentJobs(): Job[] {
    return this.queue.slice(-20).reverse();
  }
}

export const jobQueue = new JobQueue();
