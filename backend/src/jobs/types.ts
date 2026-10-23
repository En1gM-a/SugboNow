// A scheduled job. Schedules are cron expressions in Asia/Manila time.

export interface JobResult {
  status: "ok" | "skipped" | "failed";
  detail: string;
  // Rows written, when the job writes any.
  saved?: number;
}

export interface Job {
  name: string;
  schedule: string;
  description: string;
  run(now: Date): Promise<JobResult>;
}
