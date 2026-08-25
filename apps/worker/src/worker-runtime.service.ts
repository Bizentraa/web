import type { OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Job, Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { createLogger } from "@bizentra/observability";

const QUEUE_NAME = "bizentra-platform";

@Injectable()
export class WorkerRuntime implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = createLogger("bizentra-worker");
  private connection?: Redis;
  private queue?: Queue;
  private worker?: Worker;

  async onModuleInit(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error("REDIS_URL is required to start the Bizentra worker.");

    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
    this.worker = new Worker(
      QUEUE_NAME,
      (job: Job) => {
        this.logger.info("Background job completed", { jobId: job.id, jobName: job.name });
        return Promise.resolve({ processedAt: new Date().toISOString() });
      },
      { connection: this.connection, concurrency: 5 },
    );

    this.worker.on("failed", (job, error) => {
      this.logger.error("Background job failed", {
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
      });
    });

    await this.queue.add(
      "worker-started",
      { service: "bizentra-worker" },
      { jobId: `worker-started-${Date.now()}`, removeOnComplete: 25, removeOnFail: 100 },
    );
    this.logger.info("Worker is ready", { queue: QUEUE_NAME, concurrency: 5 });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }
}
