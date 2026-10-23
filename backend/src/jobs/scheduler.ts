// Runs the ingestion and brief jobs on their schedules (Asia/Manila). Only
// started when CRON_ENABLED=true, so local development doesn't use API quota.

import { schedule, type ScheduledTask } from "node-cron";
import type { Logger } from "../utils/logger";
import type { Job, JobResult } from "./types";

export const JOB_TIMEZONE = "Asia/Manila";

// Runs a job once and logs the outcome. Never throws.
export async function runJob(job: Job, logger: Logger, now = new Date()): Promise<JobResult> {
  const started = Date.now();
  try {
    const result = await job.run(now);
    const log = result.status === "failed" ? logger.warn : logger.info;
    log(`Job ${job.name}: ${result.status}`, { detail: result.detail, saved: result.saved, ms: Date.now() - started });
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(`Job ${job.name}: failed`, { detail, ms: Date.now() - started });
    return { status: "failed", detail };
  }
}

export function startScheduler(jobs: Job[], logger: Logger): ScheduledTask[] {
  const tasks = jobs.map((job) =>
    schedule(
      job.schedule,
      async () => {
        await runJob(job, logger);
      },
      { name: job.name, timezone: JOB_TIMEZONE, noOverlap: true },
    ),
  );
  logger.info(`Scheduler started: ${jobs.map((job) => `${job.name} (${job.schedule})`).join(", ")}`);
  return tasks;
}
