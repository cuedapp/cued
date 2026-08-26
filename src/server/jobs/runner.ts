import { logger } from "@/lib/logger";
import type { Job, JobExecution } from "./types";

export class InProcessJobRunner {
  private readonly running = new Set<string>();

  async execute(job: Job): Promise<JobExecution> {
    if (this.running.has(job.name)) throw new Error(`Job already running: ${job.name}`);
    this.running.add(job.name);
    const startedAt = new Date();
    try {
      logger.info("Job started", { job: job.name });
      await job.run();
      const result: JobExecution = { jobName: job.name, startedAt, finishedAt: new Date(), status: "completed" };
      logger.info("Job completed", { job: job.name });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error("Job failed", { job: job.name, error: message });
      return { jobName: job.name, startedAt, finishedAt: new Date(), status: "failed", error: message };
    } finally {
      this.running.delete(job.name);
    }
  }
}
